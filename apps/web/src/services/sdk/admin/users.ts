import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, MessageResult, PaginatedResult } from '@/types';

export interface AdminUserRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleKey: string;
  status: string;
  hasPassword: boolean;
  passwordDisplay: string;
  authProvider?: string;
  customerId?: string;
  cartItemCount: number;
  purchasedItemCount: number;
  lastLoginAt?: string | null;
  lastLoginCountry?: string | null;
  lastLoginDevice?: string | null;
  createdAt?: string;
}

function normalizeUser(raw: unknown): AdminUserRow {
  const record = raw as Record<string, unknown>;
  const hasPassword = Boolean(record.hasPassword);
  const firstName = typeof record.firstName === 'string' ? record.firstName : undefined;
  const lastName = typeof record.lastName === 'string' ? record.lastName : undefined;
  const dedupedLast =
    firstName && lastName && firstName.trim().toLowerCase() === lastName.trim().toLowerCase()
      ? undefined
      : lastName;
  return {
    id: normalizeId(record),
    email: String(record.email ?? ''),
    firstName,
    lastName: dedupedLast,
    roleKey: String(record.roleKey ?? ''),
    status: String(record.status ?? ''),
    hasPassword,
    passwordDisplay:
      typeof record.passwordDisplay === 'string'
        ? record.passwordDisplay
        : hasPassword
          ? '••••••••'
          : '—',
    authProvider: typeof record.authProvider === 'string' ? record.authProvider : undefined,
    customerId: record.customerId ? String(record.customerId) : undefined,
    cartItemCount: Number(record.cartItemCount ?? 0),
    purchasedItemCount: Number(record.purchasedItemCount ?? 0),
    lastLoginAt: typeof record.lastLoginAt === 'string' ? record.lastLoginAt : null,
    lastLoginCountry: typeof record.lastLoginCountry === 'string' ? record.lastLoginCountry : null,
    lastLoginDevice: typeof record.lastLoginDevice === 'string' ? record.lastLoginDevice : null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export interface UserListParams extends ListQueryParams {
  roleKey?: string;
  status?: string;
}

export interface AdminUpdateUserPayload {
  status?: string;
  roleKey?: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  roleKey: string;
  status?: string;
}

export const usersApi = {
  async list(params?: UserListParams): Promise<PaginatedResult<AdminUserRow>> {
    const result = await http.getPaginated<unknown>('/users', { params });
    return { ...result, data: normalizeList(result.data, normalizeUser) };
  },

  async create(payload: AdminCreateUserPayload): Promise<AdminUserRow> {
    const raw = await http.post<unknown>('/users', payload);
    return normalizeUser(raw);
  },

  async update(userId: string, payload: AdminUpdateUserPayload): Promise<AdminUserRow> {
    const raw = await http.patch<unknown>(`/users/${userId}`, payload);
    return normalizeUser(raw);
  },

  setPassword(userId: string, password: string): Promise<MessageResult> {
    return http.post<MessageResult>(`/users/${userId}/set-password`, { password });
  },

  remove(userId: string): Promise<MessageResult> {
    return http.delete<MessageResult>(`/users/${userId}`);
  },
};
