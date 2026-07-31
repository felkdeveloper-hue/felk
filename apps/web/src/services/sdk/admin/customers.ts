import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AdminCustomer {
  id: string;
  userId?: string | null;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

function normalizeCustomer(raw: unknown): AdminCustomer {
  const record = raw as Record<string, unknown>;
  const userIdRaw = record.userId;
  const userId =
    typeof userIdRaw === 'string'
      ? userIdRaw
      : userIdRaw && typeof userIdRaw === 'object' && '_id' in (userIdRaw as object)
        ? String((userIdRaw as { _id: unknown })._id)
        : userIdRaw
          ? String(userIdRaw)
          : null;
  return {
    id: normalizeId(record),
    userId,
    email: String(record.email ?? ''),
    firstName: typeof record.firstName === 'string' ? record.firstName : undefined,
    lastName: typeof record.lastName === 'string' ? record.lastName : undefined,
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export const customersApi = {
  async list(params?: ListQueryParams): Promise<PaginatedResult<AdminCustomer>> {
    const result = await http.getPaginated<unknown>('/customers', { params });
    return { ...result, data: normalizeList(result.data, normalizeCustomer) };
  },

  async getById(id: string): Promise<AdminCustomer> {
    return normalizeCustomer(await http.get<unknown>(`/customers/${id}`));
  },
};
