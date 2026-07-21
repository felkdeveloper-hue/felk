import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AdminOrderAddress {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerId?: string;
  currency: string;
  grandTotal: number;
  itemCount: number;
  paymentMethod?: string;
  paymentReference?: string;
  shippingMethod?: string;
  shippingAddress?: AdminOrderAddress | null;
  billingAddress?: AdminOrderAddress | null;
  createdAt?: string;
}

function normalizeAddress(raw: unknown): AdminOrderAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (!record.fullName && !record.line1) return null;
  return {
    fullName: String(record.fullName ?? ''),
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    line1: String(record.line1 ?? ''),
    line2:
      typeof record.line2 === 'string' ? record.line2 : record.line2 === null ? null : undefined,
    city: String(record.city ?? ''),
    state:
      typeof record.state === 'string' ? record.state : record.state === null ? null : undefined,
    postalCode: String(record.postalCode ?? ''),
    country: String(record.country ?? ''),
  };
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
    paymentReference:
      typeof record.paymentReference === 'string' ? record.paymentReference : undefined,
    shippingMethod: typeof record.shippingMethod === 'string' ? record.shippingMethod : undefined,
    shippingAddress: normalizeAddress(record.shippingAddress),
    billingAddress: normalizeAddress(record.billingAddress),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export function formatOrderAddress(address?: AdminOrderAddress | null): string {
  if (!address) return '—';
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);
  return lines.join(', ');
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
