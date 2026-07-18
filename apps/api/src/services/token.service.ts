import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import type { RoleKey } from '@/constants/roles';
import { ApiError } from '@/utils/errors/api-error';
import { generateSecureToken, hashToken } from '@/utils/token.helper';
import type { AccessTokenPayload } from '@/types';

function parseDurationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 15 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 3_600_000;
    case 'd':
      return amount * 86_400_000;
    default:
      return 15 * 60_000;
  }
}

export function getAccessTokenTtlMs(): number {
  return parseDurationToMs(appConfig.auth.accessExpiresIn);
}

export function getRefreshTokenTtlMs(rememberMe: boolean): number {
  if (rememberMe) {
    return 30 * 86_400_000;
  }
  return parseDurationToMs(appConfig.auth.refreshExpiresIn);
}

export function signAccessToken(input: {
  userId: string;
  roleId: string;
  roleKey: RoleKey;
  sessionId: string;
}): { token: string; jti: string; expiresAt: Date } {
  const jti = randomUUID();
  const expiresInMs = getAccessTokenTtlMs();
  const expiresAt = new Date(Date.now() + expiresInMs);

  const payload: AccessTokenPayload = {
    sub: input.userId,
    roleId: input.roleId,
    roleKey: input.roleKey,
    typ: 'access',
    jti,
    sid: input.sessionId,
  };

  const token = jwt.sign(payload, appConfig.auth.accessSecret, {
    expiresIn: Math.floor(expiresInMs / 1000),
  } as jwt.SignOptions);

  return { token, jti, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, appConfig.auth.accessSecret) as AccessTokenPayload;
    if (decoded.typ !== 'access') {
      throw ApiError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid or expired access token', 'INVALID_TOKEN');
  }
}

export function createOpaqueRefreshToken(): { token: string; tokenHash: string } {
  const token = generateSecureToken(48);
  return { token, tokenHash: hashToken(token) };
}

export async function blacklistAccessToken(_jti: string, _expiresAt: Date): Promise<void> {
  // No external session store — logout relies on refresh-token revocation.
}

export async function isAccessTokenBlacklisted(_jti: string): Promise<boolean> {
  return false;
}
