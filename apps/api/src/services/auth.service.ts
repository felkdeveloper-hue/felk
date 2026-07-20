import type { CookieOptions, Response } from 'express';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import {
  AUTH_COOKIES,
  AUTH_LIMITS,
  AUTH_PORTAL,
  AUDIT_ACTIONS,
  STAFF_ROLES,
  USER_STATUS,
  type AuthPortal,
} from '@/constants/auth';
import { ROLES, type RoleKey } from '@/constants/roles';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  forgotPasswordEmail,
  loginAlertEmail,
  passwordChangedEmail,
  verifyEmailTemplate,
  welcomeEmail,
} from '@/emails';
import {
  PasswordResetTokenModel,
  RefreshTokenModel,
  UserModel,
  UserSessionModel,
  VerificationTokenModel,
  type UserDocument,
} from '@/models';
import { emailService } from '@/services/email.service';
import { writeActivityLog, writeAuditLog } from '@/services/audit.service';
import { findRoleByKey, getPermissionsForRole } from '@/services/rbac.service';
import {
  blacklistAccessToken,
  createOpaqueRefreshToken,
  getAccessTokenTtlMs,
  getRefreshTokenTtlMs,
  signAccessToken,
  verifyAccessToken,
} from '@/services/token.service';
import type { AuthenticatedUser } from '@/types';
import { addMinutes } from '@/utils/date.helper';
import { normalizeEmail } from '@/utils/email.helper';
import { ApiError } from '@/utils/errors/api-error';
import {
  assertPasswordStrength,
  comparePassword,
  hashPassword,
  pushPasswordHistory,
  wasPasswordUsedRecently,
} from '@/utils/password.helper';
import { generateSecureToken, hashToken } from '@/utils/token.helper';

export interface AuthRequestMeta {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ReturnType<typeof sanitizeUser>;
}

function sanitizeUser(user: UserDocument, permissions: string[] = []) {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleKey: user.roleKey,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    permissions,
  };
}

function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: appConfig.cookie.secure,
    sameSite: appConfig.cookie.sameSite,
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; rememberMe: boolean },
): void {
  res.cookie(AUTH_COOKIES.ACCESS, tokens.accessToken, cookieOptions(getAccessTokenTtlMs()));
  res.cookie(
    AUTH_COOKIES.REFRESH,
    tokens.refreshToken,
    cookieOptions(getRefreshTokenTtlMs(tokens.rememberMe)),
  );
}

export function clearAuthCookies(res: Response): void {
  const options: CookieOptions = {
    httpOnly: true,
    secure: appConfig.cookie.secure,
    sameSite: appConfig.cookie.sameSite,
    path: '/',
  };
  res.clearCookie(AUTH_COOKIES.ACCESS, options);
  res.clearCookie(AUTH_COOKIES.REFRESH, options);
}

function assertNotLocked(user: UserDocument): void {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_LOCKED, 'ACCOUNT_LOCKED');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Account is suspended', 'ACCOUNT_SUSPENDED');
  }
}

function isStaffRole(roleKey: RoleKey): boolean {
  return (STAFF_ROLES as readonly string[]).includes(roleKey);
}

function assertPortalAccess(roleKey: RoleKey, portal: AuthPortal): void {
  if (portal === AUTH_PORTAL.ADMIN && !isStaffRole(roleKey)) {
    throw ApiError.forbidden('Admin portal access denied', 'PORTAL_DENIED');
  }
  if (portal === AUTH_PORTAL.CUSTOMER && isStaffRole(roleKey)) {
    throw ApiError.forbidden('Use the admin portal for staff accounts', 'PORTAL_DENIED');
  }
}

async function createSessionAndTokens(
  user: UserDocument,
  meta: AuthRequestMeta,
  rememberMe: boolean,
): Promise<AuthTokensResult> {
  const familyId = randomUUID();
  const refreshTtl = getRefreshTokenTtlMs(rememberMe);
  const expiresAt = new Date(Date.now() + refreshTtl);

  const session = await UserSessionModel.create({
    userId: user._id,
    familyId,
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
    deviceLabel: meta.userAgent?.slice(0, 120) ?? null,
    rememberMe,
    lastUsedAt: new Date(),
    expiresAt,
  });

  const { token: refreshToken, tokenHash } = createOpaqueRefreshToken();

  await RefreshTokenModel.create({
    userId: user._id,
    sessionId: session._id,
    familyId,
    tokenHash,
    expiresAt,
  });

  const access = signAccessToken({
    userId: user._id.toString(),
    roleId: user.roleId.toString(),
    roleKey: user.roleKey,
    sessionId: session._id.toString(),
  });

  const permissions = await getPermissionsForRole(user.roleId.toString());

  return {
    accessToken: access.token,
    refreshToken,
    expiresIn: Math.floor(getAccessTokenTtlMs() / 1000),
    user: sanitizeUser(user, permissions),
  };
}

async function issueVerificationToken(userId: Types.ObjectId): Promise<string> {
  const token = generateSecureToken(32);
  await VerificationTokenModel.updateMany(
    { userId, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );
  await VerificationTokenModel.create({
    userId,
    tokenHash: hashToken(token),
    purpose: 'email_verification',
    expiresAt: addMinutes(new Date(), AUTH_LIMITS.VERIFICATION_TOKEN_HOURS * 60),
  });
  return token;
}

function appBaseUrl(): string {
  return appConfig.cors.origins[0] ?? 'http://localhost:5173';
}

export const authService = {
  async register(
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    meta: AuthRequestMeta,
  ) {
    assertPasswordStrength(input.password);

    const email = normalizeEmail(input.email);
    const existing = await UserModel.findOne({ email, isDeleted: false });
    if (existing) {
      throw ApiError.conflict('Email already registered', undefined, 'EMAIL_EXISTS');
    }

    const role = await findRoleByKey(ROLES.CUSTOMER);
    if (!role) {
      throw ApiError.internal('Customer role is not seeded', 'ROLE_MISSING');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await UserModel.create({
      email,
      passwordHash,
      passwordHistory: [],
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone ?? null,
      roleId: role._id,
      roleKey: ROLES.CUSTOMER,
      status: USER_STATUS.PENDING_VERIFICATION,
    });

    const { customerService } = await import('@/services/customer.service');
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

    const verifyToken = await issueVerificationToken(user._id);
    const verifyUrl = `${appBaseUrl()}/verify-email?token=${verifyToken}`;

    const welcome = welcomeEmail(user.firstName);
    const verify = verifyEmailTemplate(user.firstName, verifyUrl);

    await emailService.send({
      to: user.email,
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
    });
    await emailService.send({
      to: user.email,
      subject: verify.subject,
      html: verify.html,
      text: verify.text,
    });

    // Track registration analytics (fire-and-forget)
    void import('@/services/analytics/analytics.service')
      .then(({ analyticsService }) => {
        return analyticsService
          .trackCompleteRegistration({
            email: user.email,
            ipAddress: meta.ip,
          })
          .catch(() => {});
      })
      .catch(() => {});

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      actorType: 'user',
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    await writeActivityLog({
      summary: 'User registered',
      module: 'auth',
      actorUserId: user._id.toString(),
      ip: meta.ip,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      user: sanitizeUser(user),
      message: 'Registration successful. Please verify your email.',
    };
  },

  async login(
    input: {
      email: string;
      password: string;
      rememberMe?: boolean;
      portal?: AuthPortal;
    },
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResult & { rememberMe: boolean }> {
    const email = normalizeEmail(input.email);
    const portal = input.portal ?? AUTH_PORTAL.CUSTOMER;
    const rememberMe = Boolean(input.rememberMe);

    const user = await UserModel.findOne({ email, isDeleted: false }).select(
      '+passwordHash +passwordHistory',
    );

    if (!user) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        resourceType: 'user',
        resourceId: email,
        actorType: 'anonymous',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { reason: 'user_not_found' },
      });
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }

    assertNotLocked(user);
    assertPortalAccess(user.roleKey, portal);

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= AUTH_LIMITS.MAX_FAILED_LOGINS) {
        user.lockedUntil = addMinutes(new Date(), AUTH_LIMITS.LOCK_DURATION_MINUTES);
        user.status = USER_STATUS.LOCKED;
        await user.save();

        await writeAuditLog({
          action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
          resourceType: 'user',
          resourceId: user._id.toString(),
          actorUserId: user._id.toString(),
          ip: meta.ip,
          requestId: meta.requestId,
        });
      } else {
        await user.save();
      }

      await writeAuditLog({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        resourceType: 'user',
        resourceId: user._id.toString(),
        actorType: 'anonymous',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { attempts: user.failedLoginAttempts },
      });

      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
    }

    if (!user.emailVerifiedAt) {
      throw ApiError.forbidden('Email verification required', 'EMAIL_NOT_VERIFIED');
    }

    if (user.status === USER_STATUS.LOCKED && user.lockedUntil && user.lockedUntil <= new Date()) {
      user.status = USER_STATUS.ACTIVE;
      user.lockedUntil = null;
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === USER_STATUS.LOCKED || user.status === USER_STATUS.PENDING_VERIFICATION) {
      user.status = USER_STATUS.ACTIVE;
    }
    user.lastLoginAt = new Date();
    user.lastLoginIp = meta.ip ?? null;
    await user.save();

    const tokens = await createSessionAndTokens(user, meta, rememberMe);

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { portal, rememberMe },
    });

    const alert = loginAlertEmail(user.firstName, { ip: meta.ip, userAgent: meta.userAgent });
    await emailService.send({
      to: user.email,
      subject: alert.subject,
      html: alert.html,
      text: alert.text,
    });

    return { ...tokens, rememberMe };
  },

  async refresh(
    refreshTokenRaw: string,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResult & { rememberMe: boolean }> {
    if (!refreshTokenRaw) {
      throw ApiError.unauthorized('Refresh token required', 'REFRESH_REQUIRED');
    }

    const tokenHash = hashToken(refreshTokenRaw);
    const stored = await RefreshTokenModel.findOne({ tokenHash });

    if (!stored) {
      throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH');
    }

    if (stored.revokedAt) {
      await RefreshTokenModel.updateMany(
        { familyId: stored.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
      await UserSessionModel.updateMany(
        { familyId: stored.familyId, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedReason: 'refresh_reuse' } },
      );

      await writeAuditLog({
        action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
        resourceType: 'refresh_token',
        resourceId: stored._id.toString(),
        actorUserId: stored.userId.toString(),
        ip: meta.ip,
        requestId: meta.requestId,
      });

      throw ApiError.unauthorized('Refresh token reuse detected', 'TOKEN_REUSE');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED, 'REFRESH_EXPIRED');
    }

    const session = await UserSessionModel.findById(stored.sessionId);
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw ApiError.unauthorized('Session expired', 'SESSION_EXPIRED');
    }

    const user = await UserModel.findOne({ _id: stored.userId, isDeleted: false });
    if (!user) {
      throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
    }

    assertNotLocked(user);

    const { token: newRefresh, tokenHash: newHash } = createOpaqueRefreshToken();
    stored.revokedAt = new Date();
    stored.replacedByTokenHash = newHash;
    await stored.save();

    const refreshExpiresAt = new Date(Date.now() + getRefreshTokenTtlMs(session.rememberMe));

    await RefreshTokenModel.create({
      userId: user._id,
      sessionId: session._id,
      familyId: stored.familyId,
      tokenHash: newHash,
      expiresAt: refreshExpiresAt,
    });

    session.lastUsedAt = new Date();
    session.expiresAt = refreshExpiresAt;
    session.ip = meta.ip ?? session.ip;
    await session.save();

    const access = signAccessToken({
      userId: user._id.toString(),
      roleId: user.roleId.toString(),
      roleKey: user.roleKey,
      sessionId: session._id.toString(),
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.TOKEN_REFRESH,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return {
      accessToken: access.token,
      refreshToken: newRefresh,
      expiresIn: Math.floor(getAccessTokenTtlMs() / 1000),
      user: sanitizeUser(user),
      rememberMe: session.rememberMe,
    };
  },

  async logout(input: {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthenticatedUser;
    meta: AuthRequestMeta;
  }) {
    if (input.accessToken) {
      try {
        const payload = verifyAccessToken(input.accessToken);
        const exp = payload.exp
          ? new Date(payload.exp * 1000)
          : new Date(Date.now() + getAccessTokenTtlMs());
        await blacklistAccessToken(payload.jti, exp);
      } catch {
        // ignore invalid access on logout
      }
    }

    if (input.refreshToken) {
      const tokenHash = hashToken(input.refreshToken);
      const stored = await RefreshTokenModel.findOne({ tokenHash, revokedAt: null });
      if (stored) {
        stored.revokedAt = new Date();
        await stored.save();
        await UserSessionModel.findByIdAndUpdate(stored.sessionId, {
          revokedAt: new Date(),
          revokedReason: 'logout',
        });
      }
    } else if (input.user?.sessionId) {
      await UserSessionModel.findByIdAndUpdate(input.user.sessionId, {
        revokedAt: new Date(),
        revokedReason: 'logout',
      });
      await RefreshTokenModel.updateMany(
        { sessionId: input.user.sessionId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_LOGOUT,
      resourceType: 'user',
      resourceId: input.user?.id,
      actorUserId: input.user?.id,
      ip: input.meta.ip,
      userAgent: input.meta.userAgent,
      requestId: input.meta.requestId,
    });
  },

  async logoutAll(userId: string, meta: AuthRequestMeta, currentAccessJti?: string) {
    await UserSessionModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'logout_all' } },
    );
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    if (currentAccessJti) {
      await blacklistAccessToken(currentAccessJti, new Date(Date.now() + getAccessTokenTtlMs()));
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_LOGOUT_ALL,
      resourceType: 'user',
      resourceId: userId,
      actorUserId: userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  },

  async forgotPassword(emailRaw: string, meta: AuthRequestMeta) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false });

    // Always succeed to avoid account enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const token = generateSecureToken(32);
    await PasswordResetTokenModel.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );
    await PasswordResetTokenModel.create({
      userId: user._id,
      tokenHash: hashToken(token),
      expiresAt: addMinutes(new Date(), AUTH_LIMITS.RESET_TOKEN_MINUTES),
      requestedIp: meta.ip ?? null,
    });

    const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
    const tpl = forgotPasswordEmail(user.firstName, resetUrl);
    await emailService.send({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { message: 'If the email exists, a reset link has been sent.' };
  },

  async resetPassword(token: string, newPassword: string, meta: AuthRequestMeta) {
    assertPasswordStrength(newPassword);

    const tokenHash = hashToken(token);
    const stored = await PasswordResetTokenModel.findOne({ tokenHash });

    if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('Invalid or expired reset token', undefined, 'INVALID_RESET_TOKEN');
    }

    const user = await UserModel.findById(stored.userId).select('+passwordHash +passwordHistory');
    if (!user || user.isDeleted) {
      throw ApiError.badRequest('Invalid or expired reset token', undefined, 'INVALID_RESET_TOKEN');
    }

    if (await wasPasswordUsedRecently(newPassword, [user.passwordHash, ...user.passwordHistory])) {
      throw ApiError.badRequest('Password was used recently', undefined, 'PASSWORD_REUSED');
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHistory = pushPasswordHistory(user.passwordHash, user.passwordHistory);
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === USER_STATUS.LOCKED) {
      user.status = USER_STATUS.ACTIVE;
    }
    await user.save();

    stored.consumedAt = new Date();
    await stored.save();

    await UserSessionModel.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'password_reset' } },
    );
    await RefreshTokenModel.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    const tpl = passwordChangedEmail(user.firstName);
    await emailService.send({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { message: 'Password reset successful' };
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: AuthRequestMeta,
  ) {
    assertPasswordStrength(newPassword);

    const user = await UserModel.findById(userId).select('+passwordHash +passwordHistory');
    if (!user || user.isDeleted) {
      throw ApiError.unauthorized();
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Current password is incorrect', 'INVALID_PASSWORD');
    }

    if (await wasPasswordUsedRecently(newPassword, [user.passwordHash, ...user.passwordHistory])) {
      throw ApiError.badRequest('Password was used recently', undefined, 'PASSWORD_REUSED');
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHistory = pushPasswordHistory(user.passwordHash, user.passwordHistory);
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    await user.save();

    const tpl = passwordChangedEmail(user.firstName);
    await emailService.send({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { message: 'Password changed successfully' };
  },

  async verifyEmail(token: string, meta: AuthRequestMeta) {
    const tokenHash = hashToken(token);
    const stored = await VerificationTokenModel.findOne({ tokenHash });

    if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest(
        'Invalid or expired verification token',
        undefined,
        'INVALID_VERIFY_TOKEN',
      );
    }

    const user = await UserModel.findById(stored.userId);
    if (!user || user.isDeleted) {
      throw ApiError.badRequest(
        'Invalid or expired verification token',
        undefined,
        'INVALID_VERIFY_TOKEN',
      );
    }

    user.emailVerifiedAt = new Date();
    user.status = USER_STATUS.ACTIVE;
    await user.save();

    stored.consumedAt = new Date();
    await stored.save();

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { message: 'Email verified successfully', user: sanitizeUser(user) };
  },

  async resendVerification(emailRaw: string, meta: AuthRequestMeta) {
    const email = normalizeEmail(emailRaw);
    const user = await UserModel.findOne({ email, isDeleted: false });

    if (!user || user.emailVerifiedAt) {
      return { message: 'If verification is required, a new email has been sent.' };
    }

    const token = await issueVerificationToken(user._id);
    const verifyUrl = `${appBaseUrl()}/verify-email?token=${token}`;
    const tpl = verifyEmailTemplate(user.firstName, verifyUrl);
    await emailService.send({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: user._id.toString(),
      ip: meta.ip,
      requestId: meta.requestId,
    });

    return { message: 'If verification is required, a new email has been sent.' };
  },

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw ApiError.unauthorized();
    }

    const permissions = await getPermissionsForRole(user.roleId.toString());

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId.toString(),
      roleKey: user.roleKey,
      permissions,
      sessionId: '',
      emailVerified: Boolean(user.emailVerifiedAt),
      status: user.status,
    };
  },

  async buildAuthenticatedUser(payload: {
    userId: string;
    sessionId: string;
  }): Promise<AuthenticatedUser> {
    const user = await UserModel.findOne({ _id: payload.userId, isDeleted: false });
    if (!user) {
      throw ApiError.unauthorized();
    }

    assertNotLocked(user);

    const session = await UserSessionModel.findById(payload.sessionId);
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw ApiError.unauthorized('Session expired', 'SESSION_EXPIRED');
    }

    const permissions = await getPermissionsForRole(user.roleId.toString());

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId.toString(),
      roleKey: user.roleKey,
      permissions,
      sessionId: session._id.toString(),
      emailVerified: Boolean(user.emailVerifiedAt),
      status: user.status,
    };
  },
};
