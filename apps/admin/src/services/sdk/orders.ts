import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerId?: string;
  currency: string;
  grandTotal: number;
  itemCount: number;
  paymentMethod?: string;
  createdAt?: string;
}

function normalizeOrder(raw: unknown): AdminOrder {
  const record = raw as Record<string, unknown>;
  const totals = (record.totals as Record<string, unknown>) ?? {};
  const items = Array.isArray(record.items) ? record.items : [];
  return {
    id: normalizeId(record),
    orderNumber: String(record.orderNumber ?? ''),
    status: String(record.status ?? 'pending'),
    customerId: record.customerId ? String(record.customerId) : undefined,
    currency: String(record.currency ?? totals.currency ?? 'LKR'),
    grandTotal: Number(totals.grandTotal ?? 0),
    itemCount: Number(totals.totalQuantity ?? items.length),
    paymentMethod: typeof record.paymentMethod === 'string' ? record.paymentMethod : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export interface OrderListParams extends ListQueryParams {
  status?: string;
  customerId?: string;
}

export const ordersApi = {
  async list(params?: OrderListParams): Promise<PaginatedResult<AdminOrder>> {
    const result = await http.getPaginated<unknown>('/orders', { params });
    return { ...result, data: normalizeList(result.data, normalizeOrder) };
  },

  async getById(id: string): Promise<unknown> {
    return http.get<unknown>(`/orders/${id}`);
  },

  async updateStatus(id: string, status: string, note?: string): Promise<unknown> {
    return http.patch<unknown>(`/orders/${id}/status`, { status, note });
  },

  async getTimeline(id: string): Promise<unknown[]> {
    return http.get<unknown[]>(`/orders/${id}/timeline`);
  },

  async getInvoice(id: string): Promise<unknown> {
    return http.get<unknown>(`/orders/${id}/invoice`);
  },

  async listReturns(id: string): Promise<unknown[]> {
    return http.get<unknown[]>(`/orders/${id}/returns`);
  },

  async addNote(id: string, note: string): Promise<unknown> {
    return http.post<unknown>(`/orders/${id}/note`, { note });
  },
};
