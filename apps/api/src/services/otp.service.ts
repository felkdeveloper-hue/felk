import { AUTH_LIMITS, AUDIT_ACTIONS, USER_STATUS } from '@/constants/auth';
import { EmailOtpModel } from '@/models/email-otp.model';
import { UserModel } from '@/models/user.model';
import { emailService } from '@/services/email/email.service';
import { writeAuditLog } from '@/services/audit.service';
import type { AuthRequestMeta, AuthTokensResult } from '@/services/auth.service';
import { addMinutes } from '@/utils/date.helper';
import { normalizeEmail } from '@/utils/email.helper';
import { generateEmailOtp, hashEmailOtp, verifyEmailOtp } from '@/utils/email-otp.helper';
import { ApiError } from '@/utils/errors/api-error';
import { logger } from '@/config/logger';

const GENERIC_SENT_MESSAGE = 'If verification is required, a verification code has been sent.';

async function invalidateExistingOtps(email: string): Promise<void> {
  await EmailOtpModel.deleteMany({ email, verified: false });
}

async function createAndSendOtp(email: string, userId?: string): Promise<void> {
  const user = userId
    ? await UserModel.findById(userId)
    : await UserModel.findOne({ email, isDeleted: false });

  if (!user || user.emailVerifiedAt) {
    return;
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
    userId: user._id,
  });

  await emailService.sendVerificationOTP(email, otp, {
    name: user.firstName,
    expiryMinutes: AUTH_LIMITS.OTP_EXPIRY_MINUTES,
  });

  // Gmail SMTP "sent" ≠ recipient inbox. In local/dev, always print the OTP
  // so testing is not blocked when the mail lands in Spam/Promotions.
  if (process.env.NODE_ENV !== 'production') {
    logger.warn({ email, otp }, 'DEV: verification OTP (check this if inbox is empty)');
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
    resourceType: 'user',
    resourceId: user._id.toString(),
    actorUserId: user._id.toString(),
  });
}

export const otpService = {
  async sendOtp(emailRaw: string, meta: AuthRequestMeta) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false });

    if (!user || user.emailVerifiedAt) {
      logger.info({ email, ip: meta.ip }, 'OTP send: generic response');
      return { message: GENERIC_SENT_MESSAGE };
    }

    try {
      await createAndSendOtp(email, user._id.toString());
    } catch (err) {
      logger.error({ err, email }, 'OTP send failed');
      throw ApiError.internal('Unable to send verification email', 'EMAIL_SEND_FAILED');
    }

    return { message: GENERIC_SENT_MESSAGE };
  },

  async resendOtp(emailRaw: string, meta: AuthRequestMeta) {
    return this.sendOtp(emailRaw, meta);
  },

  async verifyOtp(
    emailRaw: string,
    otp: string,
    meta: AuthRequestMeta,
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

    const { authService } = await import('@/services/auth.service');
    const tokens = await authService.issueAuthSession(user._id.toString(), meta, false);

    void emailService
      .sendWelcomeEmail({ email: user.email, firstName: user.firstName })
      .catch((err) => logger.warn({ err, email }, 'Welcome email failed after verification'));

    return {
      ...tokens,
      message: 'Email verified successfully',
      rememberMe: false,
    };
  },

  async issueOtpForUser(userId: string, email: string): Promise<void> {
    await createAndSendOtp(normalizeEmail(email), userId);
  },
};
