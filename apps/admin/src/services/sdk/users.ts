import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

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
  createdAt?: string;
}

function normalizeUser(raw: unknown): AdminUserRow {
  const record = raw as Record<string, unknown>;
  const hasPassword = Boolean(record.hasPassword);
  return {
    id: normalizeId(record),
    email: String(record.email ?? ''),
    firstName: typeof record.firstName === 'string' ? record.firstName : undefined,
    lastName: typeof record.lastName === 'string' ? record.lastName : undefined,
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
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export interface UserListParams extends ListQueryParams {
  roleKey?: string;
  status?: string;
}

export const usersApi = {
  async list(params?: UserListParams): Promise<PaginatedResult<AdminUserRow>> {
    const result = await http.getPaginated<unknown>('/users', { params });
    return { ...result, data: normalizeList(result.data, normalizeUser) };
  },
};
