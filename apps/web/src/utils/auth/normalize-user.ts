import type { AuthSession, AuthUser } from '@/types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

export function normalizeAuthUser(raw: unknown): AuthUser {
  const record = asRecord(raw);
  const roleKey = typeof record.roleKey === 'string' ? record.roleKey : undefined;
  const roles = Array.isArray(record.roles)
    ? record.roles.map(String)
    : roleKey
      ? [roleKey]
      : ['customer'];

  const firstName = typeof record.firstName === 'string' ? record.firstName : undefined;
  const lastNameRaw = typeof record.lastName === 'string' ? record.lastName : undefined;
  const lastName =
    firstName && lastNameRaw && firstName.trim().toLowerCase() === lastNameRaw.trim().toLowerCase()
      ? undefined
      : lastNameRaw;

  return {
    id: String(record.id ?? record._id ?? ''),
    email: String(record.email ?? ''),
    firstName,
    lastName,
    name:
      typeof record.name === 'string'
        ? record.name
        : [firstName, lastName].filter(Boolean).join(' ') || undefined,
    avatarUrl:
      typeof record.profilePhotoUrl === 'string'
        ? record.profilePhotoUrl
        : typeof record.avatarUrl === 'string'
          ? record.avatarUrl
          : undefined,
    roles,
    permissions: Array.isArray(record.permissions) ? record.permissions.map(String) : [],
    isEmailVerified: Boolean(record.emailVerified ?? record.isEmailVerified),
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : undefined,
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    dateOfBirth: typeof record.dateOfBirth === 'string' ? record.dateOfBirth : undefined,
    gender: typeof record.gender === 'string' ? record.gender : undefined,
  };
}

export function normalizeAuthSession(raw: unknown): AuthSession {
  const record = asRecord(raw);
  return {
    accessToken: String(record.accessToken ?? ''),
    refreshToken: String(record.refreshToken ?? ''),
    tokenType: record.tokenType === 'Bearer' ? 'Bearer' : undefined,
    expiresIn: typeof record.expiresIn === 'number' ? record.expiresIn : undefined,
    user: normalizeAuthUser(record.user),
  };
}
