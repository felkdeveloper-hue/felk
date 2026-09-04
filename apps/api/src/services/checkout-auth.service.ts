import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AUTH_LIMITS, AUDIT_ACTIONS, USER_STATUS } from '@/constants/auth.js';
import { ROLES } from '@/constants/roles.js';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { EmailOtpModel } from '@/models/email-otp.model.js';
import { UserModel } from '@/models/user.model.js';
import type { RoleDocument } from '@/models/role.model.js';
import { writeAuditLog } from '@/services/audit.service.js';
import {
  authService,
  type AuthRequestMeta,
  type AuthTokensResult,
} from '@/services/auth.service.js';
import { emailService } from '@/services/email/email.service.js';
import { findRoleByKey } from '@/services/rbac.service.js';
import { attachDevVerificationCode } from '@/utils/dev-verification.helper.js';
import { addMinutes } from '@/utils/date.helper.js';
import { normalizeEmail } from '@/utils/email.helper.js';
import { generateEmailOtp, hashEmailOtp, verifyEmailOtp } from '@/utils/email-otp.helper.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { assertRegisterPassword, hashPassword } from '@/utils/password.helper.js';

const CHECKOUT_SIGNUP_PURPOSE = 'checkout_signup' as const;
const SIGNUP_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * Guests never password-login (OTP / forgot-password only if converted).
 * Skip argon2 hashing on the hot path — verify rejects this sentinel.
 */
const GUEST_PASSWORD_HASH_SENTINEL = 'guest-no-password';

let cachedCustomerRole: RoleDocument | null = null;

async function getCustomerRole() {
  if (cachedCustomerRole) return cachedCustomerRole;
  const role = await findRoleByKey(ROLES.CUSTOMER);
  if (role) cachedCustomerRole = role;
  return role;
}

type CheckoutSignupTokenPayload = {
  email: string;
  purpose: typeof CHECKOUT_SIGNUP_PURPOSE;
};

function signCheckoutSignupToken(email: string): string {
  return jwt.sign(
    { email, purpose: CHECKOUT_SIGNUP_PURPOSE } satisfies CheckoutSignupTokenPayload,
    appConfig.auth.accessSecret,
    { expiresIn: SIGNUP_TOKEN_TTL_SECONDS },
  );
}

function verifyCheckoutSignupToken(token: string): string {
  try {
    const payload = jwt.verify(token, appConfig.auth.accessSecret) as CheckoutSignupTokenPayload;
    if (payload.purpose !== CHECKOUT_SIGNUP_PURPOSE || !payload.email) {
      throw ApiError.badRequest('Invalid signup token', undefined, 'INVALID_SIGNUP_TOKEN');
    }
    return normalizeEmail(payload.email);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Signup token expired or invalid', undefined, 'INVALID_SIGNUP_TOKEN');
  }
}

export const checkoutAuthService = {
  async emailStatus(emailRaw: string) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false }).select('emailVerifiedAt');
    if (!user) {
      return { exists: false, verified: false };
    }
    return { exists: true, verified: Boolean(user.emailVerifiedAt) };
  },

  async sendOtp(emailRaw: string, meta: AuthRequestMeta) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false });

    if (user?.emailVerifiedAt) {
      throw ApiError.conflict(
        'This email is already registered. Sign in instead.',
        undefined,
        'EMAIL_EXISTS',
      );
    }

    // Unverified existing account — reuse standard OTP path.
    if (user) {
      const { otpService } = await import('@/services/otp.service.js');
      return otpService.sendOtp(email, meta);
    }

    await EmailOtpModel.deleteMany({ email, verified: false, purpose: CHECKOUT_SIGNUP_PURPOSE });

    const otp = generateEmailOtp();
    const otpHash = await hashEmailOtp(otp);
    await EmailOtpModel.create({
      email,
      otpHash,
      expiresAt: addMinutes(new Date(), AUTH_LIMITS.OTP_EXPIRY_MINUTES),
      attempts: 0,
      verified: false,
      purpose: CHECKOUT_SIGNUP_PURPOSE,
    });

    // Queue SMTP in background so Continue is not blocked by Titan latency.
    emailService.enqueueVerificationOTP(email, otp, {
      name: 'there',
      expiryMinutes: AUTH_LIMITS.OTP_EXPIRY_MINUTES,
    });
    const delivered = emailService.isConfigured();

    void writeAuditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      resourceType: 'user',
      resourceId: email,
      metadata: { purpose: CHECKOUT_SIGNUP_PURPOSE, delivered, ip: meta.ip },
    });

    return attachDevVerificationCode(
      { message: 'A verification code has been sent to your email.' },
      otp,
      delivered,
    );
  },

  async verifyOtp(emailRaw: string, otp: string) {
    const email = normalizeEmail(emailRaw);
    const invalid = () =>
      ApiError.badRequest('Invalid or expired verification code', undefined, 'INVALID_VERIFY_CODE');

    const user = await UserModel.findOne({ email, isDeleted: false });
    if (user) {
      // Existing unverified users complete via standard verify-otp (returns tokens).
      const { otpService } = await import('@/services/otp.service.js');
      return {
        mode: 'login' as const,
        ...(await otpService.verifyOtp(email, otp, {})),
      };
    }

    const record = await EmailOtpModel.findOne({
      email,
      verified: false,
      purpose: CHECKOUT_SIGNUP_PURPOSE,
    }).sort({ createdAt: -1 });

    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw invalid();
    }

    if (record.attempts >= AUTH_LIMITS.OTP_MAX_ATTEMPTS) {
      throw ApiError.badRequest('Too many invalid attempts', undefined, 'OTP_LOCKED');
    }

    const ok = await verifyEmailOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      throw invalid();
    }

    record.verified = true;
    await record.save();

    const signupToken = signCheckoutSignupToken(email);
    return {
      mode: 'signup' as const,
      signupToken,
      email,
      expiresIn: SIGNUP_TOKEN_TTL_SECONDS,
      message: 'Email verified — create your password to continue',
    };
  },

  async completeSignup(
    input: {
      signupToken: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      fbp?: string | null;
      fbc?: string | null;
      fbclid?: string | null;
    },
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResult & { rememberMe: boolean; message: string }> {
    assertRegisterPassword(input.password);
    const email = verifyCheckoutSignupToken(input.signupToken);

    const verifiedOtp = await EmailOtpModel.findOne({
      email,
      verified: true,
      purpose: CHECKOUT_SIGNUP_PURPOSE,
    }).sort({ createdAt: -1 });

    if (!verifiedOtp) {
      throw ApiError.badRequest(
        'Email verification required before signup',
        undefined,
        'OTP_REQUIRED',
      );
    }

    const existing = await UserModel.findOne({ email, isDeleted: false });
    const role = await findRoleByKey(ROLES.CUSTOMER);
    if (!role) {
      throw ApiError.internal('Customer role is not seeded', 'ROLE_MISSING');
    }

    const passwordHash = await hashPassword(input.password);
    let user = existing;

    // Idempotent: first click may have created the user then failed on customer/session.
    // A valid signup token + verified OTP means they may resume instead of EMAIL_EXISTS.
    if (user) {
      user.passwordHash = passwordHash;
      user.passwordHistory = [];
      user.firstName = input.firstName.trim();
      user.lastName = input.lastName.trim();
      user.phone = input.phone ?? null;
      user.roleId = role._id;
      user.roleKey = ROLES.CUSTOMER;
      user.status = USER_STATUS.ACTIVE;
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
      await user.save();
    } else {
      user = await UserModel.create({
        email,
        passwordHash,
        passwordHistory: [],
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone ?? null,
        roleId: role._id,
        roleKey: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      });
    }

    const { customerService } = await import('@/services/customer.service.js');
    const customer = await customerService.ensureForUser(
      {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      {
        userId: user._id.toString(),
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      },
    );

    await EmailOtpModel.deleteMany({ email, purpose: CHECKOUT_SIGNUP_PURPOSE });

    const tokens = await authService.issueAuthSession(user._id.toString(), meta, true);

    void writeAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      metadata: { source: 'checkout_signup', ip: meta.ip },
    });

    const { trackCompleteRegistrationSafely } =
      await import('@/services/analytics/complete-registration.tracking.js');
    trackCompleteRegistrationSafely({
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      customerId: customer._id.toString(),
      meta,
      fbp: input.fbp,
      fbc: input.fbc,
      fbclid: input.fbclid,
      eventSourcePath: '/checkout/information',
    });

    return {
      ...tokens,
      rememberMe: true,
      message: 'Account created',
    };
  },

  /**
   * One-click guest checkout — no email/OTP/password.
   * Creates an ephemeral guest customer session; shopper only needs an address next.
   * Optimized for <1s: no argon2, cached role, session before cart merge.
   */
  async continueAsGuest(
    input: {
      guestCartToken?: string;
      visitorId?: string;
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
    },
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResult & { rememberMe: boolean; message: string }> {
    const role = await getCustomerRole();
    if (!role) {
      throw ApiError.internal('Customer role is not seeded', 'ROLE_MISSING');
    }

    const email = `guest-${randomUUID()}@guest.fe.lk`;

    const user = await UserModel.create({
      email,
      passwordHash: GUEST_PASSWORD_HASH_SENTINEL,
      passwordHistory: [],
      firstName: 'Guest',
      lastName: 'Shopper',
      phone: null,
      roleId: role._id,
      roleKey: ROLES.CUSTOMER,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      metadata: { checkoutGuest: true },
    });

    const { customerService } = await import('@/services/customer.service.js');
    const actor = {
      userId: user._id.toString(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    };

    // Customer profile + JWT in parallel. Cart merge runs in the background so this
    // endpoint stays under ~1s (guest bag stays local in the browser until then).
    const [customer, tokens] = await Promise.all([
      customerService.ensureForUser(
        {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
        actor,
      ),
      authService.issueAuthSession(user._id.toString(), meta, true),
    ]);

    const guestCartToken = input.guestCartToken;
    if (guestCartToken) {
      void (async () => {
        try {
          const { cartService } = await import('@/services/cart.service.js');
          await cartService.merge(customer._id.toString(), guestCartToken, actor);
        } catch (err) {
          logger.warn({ err, email }, 'Guest cart merge failed — client will retry with local bag');
        }
      })();
    }

    void writeAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      metadata: { source: 'checkout_continue_as_guest', ip: meta.ip },
    });

    try {
      const { linkVisitorToUser } =
        await import('@/services/platform-analytics/link-visitor.service.js');
      await linkVisitorToUser({
        userId: user._id.toString(),
        ip: meta.ip,
        userAgent: meta.userAgent,
        attribution: {
          visitorId: input.visitorId,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmTerm: input.utmTerm,
          utmContent: input.utmContent,
          referrer: input.referrer,
          fbclid: input.fbclid,
          gclid: input.gclid,
          ttclid: input.ttclid,
          msclkid: input.msclkid,
          igshid: input.igshid,
          inAppSource: input.inAppSource,
          landingPath: input.landingPath,
        },
      });
    } catch (err) {
      logger.warn({ err, email }, 'Guest visitor attribution link failed');
    }

    return {
      ...tokens,
      rememberMe: true,
      message: 'Continuing as guest',
    };
  },

  /**
   * @deprecated Prefer continueAsGuest — kept for older clients that verified email OTP first.
   */
  async completeAsGuest(
    input: {
      signupToken: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResult & { rememberMe: boolean; message: string }> {
    const email = verifyCheckoutSignupToken(input.signupToken);

    const verifiedOtp = await EmailOtpModel.findOne({
      email,
      verified: true,
      purpose: CHECKOUT_SIGNUP_PURPOSE,
    }).sort({ createdAt: -1 });

    if (!verifiedOtp) {
      throw ApiError.badRequest(
        'Email verification required before continuing as guest',
        undefined,
        'OTP_REQUIRED',
      );
    }

    const existing = await UserModel.findOne({ email, isDeleted: false });
    if (existing?.emailVerifiedAt) {
      throw ApiError.conflict(
        'This email already has an account. Sign in to continue.',
        undefined,
        'EMAIL_EXISTS',
      );
    }

    const role = await findRoleByKey(ROLES.CUSTOMER);
    if (!role) {
      throw ApiError.internal('Customer role is not seeded', 'ROLE_MISSING');
    }

    const passwordHash = await hashPassword(`${randomBytes(32).toString('hex')}Aa1!`);
    const firstName = input.firstName.trim() || 'Guest';
    const lastName = input.lastName.trim() || 'Shopper';
    let user = existing;

    if (user) {
      user.passwordHash = passwordHash;
      user.passwordHistory = [];
      user.firstName = firstName;
      user.lastName = lastName;
      user.phone = input.phone ?? null;
      user.roleId = role._id;
      user.roleKey = ROLES.CUSTOMER;
      user.status = USER_STATUS.ACTIVE;
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
      user.metadata = { ...(user.metadata ?? {}), checkoutGuest: true };
      await user.save();
    } else {
      user = await UserModel.create({
        email,
        passwordHash,
        passwordHistory: [],
        firstName,
        lastName,
        phone: input.phone ?? null,
        roleId: role._id,
        roleKey: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
        metadata: { checkoutGuest: true },
      });
    }

    const { customerService } = await import('@/services/customer.service.js');
    await customerService.ensureForUser(
      {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      {
        userId: user._id.toString(),
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      },
    );

    await EmailOtpModel.deleteMany({ email, purpose: CHECKOUT_SIGNUP_PURPOSE });

    const tokens = await authService.issueAuthSession(user._id.toString(), meta, true);

    void writeAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      metadata: { source: 'checkout_guest', ip: meta.ip },
    });

    logger.info({ userId: user._id.toString(), email }, 'Checkout guest session created');

    return {
      ...tokens,
      rememberMe: true,
      message: 'Continuing as guest',
    };
  },
};
