import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface PaymentRow {
  id: string;
  referenceNumber?: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  createdAt?: string;
}

export const paymentsApi = {
  async list(
    params?: ListQueryParams & { status?: string; method?: string },
  ): Promise<PaginatedResult<PaymentRow>> {
    const result = await http.getPaginated<unknown>('/payments', { params });
    return {
      ...result,
      data: normalizeList(result.data, (raw) => {
        const record = raw as Record<string, unknown>;
        return {
          id: normalizeId(record),
          referenceNumber:
            typeof record.referenceNumber === 'string' ? record.referenceNumber : undefined,
          method: String(record.method ?? ''),
          status: String(record.status ?? ''),
          amount: Number(record.amount ?? 0),
          currency: String(record.currency ?? 'LKR'),
          createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
        };
      }),
    };
  },

  async refund(id: string, payload?: { amount?: number; reason?: string }): Promise<unknown> {
    return http.post<unknown>(`/payments/${id}/refund`, payload ?? {});
  },
};
