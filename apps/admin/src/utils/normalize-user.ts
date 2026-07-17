import type { AuthUser } from '@/types';

type UnknownRecord = Record<string, unknown>;

export function normalizeAuthUser(raw: unknown): AuthUser {
  const record = raw as UnknownRecord;
  const roleKey = typeof record.roleKey === 'string' ? record.roleKey : undefined;
  const roles = Array.isArray(record.roles) ? record.roles.map(String) : roleKey ? [roleKey] : [];

  return {
    id: String(record.id ?? record._id ?? ''),
    email: String(record.email ?? ''),
    firstName: typeof record.firstName === 'string' ? record.firstName : undefined,
    lastName: typeof record.lastName === 'string' ? record.lastName : undefined,
    roles,
    permissions: Array.isArray(record.permissions) ? record.permissions.map(String) : [],
    isEmailVerified: Boolean(record.emailVerified ?? record.isEmailVerified),
  };
}
