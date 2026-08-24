import { AUTH_LIMITS, AUDIT_ACTIONS, USER_STATUS } from '@/constants/auth.js';
import { EmailOtpModel } from '@/models/email-otp.model.js';
import { UserModel } from '@/models/user.model.js';
import { emailService } from '@/services/email/email.service.js';
import { writeAuditLog } from '@/services/audit.service.js';
import type { AuthRequestMeta, AuthTokensResult } from '@/services/auth.service.js';
import { attachDevVerificationCode } from '@/utils/dev-verification.helper.js';
import { addMinutes } from '@/utils/date.helper.js';
import { normalizeEmail } from '@/utils/email.helper.js';
import { generateEmailOtp, hashEmailOtp, verifyEmailOtp } from '@/utils/email-otp.helper.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { logger } from '@/config/logger.js';

const GENERIC_SENT_MESSAGE = 'If verification is required, a verification code has been sent.';

export type OtpIssueResult = {
  delivered: boolean;
  otp: string;
};

async function invalidateExistingOtps(email: string): Promise<void> {
  await EmailOtpModel.deleteMany({ email, verified: false });
}

async function createAndSendOtp(email: string, userId?: string): Promise<OtpIssueResult | null> {
  const user = userId
    ? await UserModel.findById(userId)
    : await UserModel.findOne({ email, isDeleted: false });

  if (!user || user.emailVerifiedAt) {
    return null;
  }

  await invalidateExistingOtps(email);

  const otp = generateEmailOtp();
  const otpHash = await hashEmailOtp(otp);

  await EmailOtpModel.create({
    email,
    otpHash,
    expiresAt: addMinutes(new Date(), AUTH_LIMITS.OTP_EXPIRY_MINUTES),
    attempts: 0,
    verified: false,
    purpose: 'email_verification',
    userId: user._id,
  });

  emailService.enqueueVerificationOTP(email, otp, {
    name: user.firstName,
    expiryMinutes: AUTH_LIMITS.OTP_EXPIRY_MINUTES,
  });
  const delivered = emailService.isConfigured();

  void writeAuditLog({
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
    resourceType: 'user',
    resourceId: user._id.toString(),
    actorUserId: user._id.toString(),
    metadata: { delivered },
  });

  return { delivered, otp };
}

export const otpService = {
  async sendOtp(emailRaw: string, meta: AuthRequestMeta) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false });

    if (!user || user.emailVerifiedAt) {
      logger.info({ email, ip: meta.ip }, 'OTP send: generic response');
      return { message: GENERIC_SENT_MESSAGE };
    }

    const result = await createAndSendOtp(email, user._id.toString());
    if (!result) {
      return { message: GENERIC_SENT_MESSAGE };
    }

    return attachDevVerificationCode(
      { message: GENERIC_SENT_MESSAGE },
      result.otp,
      result.delivered,
    );
  },

  async resendOtp(emailRaw: string, meta: AuthRequestMeta) {
    return this.sendOtp(emailRaw, meta);
  },

  async verifyOtp(
    emailRaw: string,
    otp: string,
    meta: AuthRequestMeta,
    attribution?: {
      visitorId?: string | null;
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
      utmTerm?: string | null;
      utmContent?: string | null;
      referrer?: string | null;
      fbclid?: string | null;
      gclid?: string | null;
      ttclid?: string | null;
      msclkid?: string | null;
      igshid?: string | null;
      inAppSource?: string | null;
      landingPath?: string | null;
    } | null,
  ): Promise<AuthTokensResult & { message: string; rememberMe: boolean }> {
    const email = normalizeEmail(emailRaw);
    const invalidCodeError = () =>
      ApiError.badRequest('Invalid or expired verification code', undefined, 'INVALID_VERIFY_CODE');

    const user = await UserModel.findOne({ email, isDeleted: false });
    if (!user) {
      throw invalidCodeError();
    }

    if (user.emailVerifiedAt) {
      throw ApiError.badRequest('Email is already verified', undefined, 'ALREADY_VERIFIED');
    }

    const stored = await EmailOtpModel.findOne({
      email,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!stored || stored.expiresAt.getTime() <= Date.now()) {
      throw invalidCodeError();
    }

    if (stored.attempts >= AUTH_LIMITS.OTP_MAX_ATTEMPTS) {
      await EmailOtpModel.deleteOne({ _id: stored._id });
      throw ApiError.badRequest(
        'Too many incorrect attempts. Request a new code.',
        undefined,
        'OTP_MAX_ATTEMPTS',
      );
    }

    const valid = await verifyEmailOtp(otp, stored.otpHash);
    if (!valid) {
      stored.attempts += 1;
      await stored.save();
      throw invalidCodeError();
    }

    user.emailVerifiedAt = new Date();
    user.status = USER_STATUS.ACTIVE;
    await user.save();

    await EmailOtpModel.deleteOne({ _id: stored._id });

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    const { authService } = await import('@/services/auth.service.js');
    const tokens = await authService.issueAuthSession(user._id.toString(), meta, false);

    try {
      const { linkVisitorToUser } =
        await import('@/services/platform-analytics/link-visitor.service.js');
      await linkVisitorToUser({
        userId: user._id.toString(),
        ip: meta.ip,
        userAgent: meta.userAgent,
        attribution: attribution ?? { visitorId: null },
      });
    } catch {
      /* attribution must never block verification */
    }

    void emailService
      .sendWelcomeEmail({ email: user.email, firstName: user.firstName })
      .catch((err) => logger.warn({ err, email }, 'Welcome email failed after verification'));

    return {
      ...tokens,
      message: 'Email verified successfully',
      rememberMe: false,
    };
  },

  async issueOtpForUser(userId: string, email: string): Promise<OtpIssueResult> {
    const result = await createAndSendOtp(normalizeEmail(email), userId);
    if (!result) {
      throw ApiError.badRequest('Unable to issue verification code', undefined, 'OTP_ISSUE_FAILED');
    }
    return result;
  },
};
