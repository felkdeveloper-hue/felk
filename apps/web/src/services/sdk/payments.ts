import { http } from '@/lib/http-client';
import type { ListQueryParams, PaginatedResult } from '@/types';

export type PaymentMethod =
  | 'payhere'
  | 'koko'
  | 'mintpay'
  | 'cod'
  | 'stripe'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | string;

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
  | string;

export interface PaymentCreatePayload {
  checkoutId?: string;
  checkoutToken?: string;
  method: PaymentMethod;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentRetryPayload {
  paymentId?: string;
  checkoutToken?: string;
  method?: PaymentMethod;
}

export interface PaymentRecord {
  id: string;
  referenceNumber?: string;
  checkoutId: string;
  checkoutToken?: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  redirectUrl?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentStatusResult {
  checkoutToken: string;
  status: PaymentStatus;
  method: string;
  amount: number;
  currency: string;
  redirectUrl?: string | null;
  updatedAt?: string;
}

export interface RefundRequestPayload {
  amount?: number;
  reason?: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  reason?: string;
}

function normalizePayment(raw: unknown): PaymentRecord {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(record.id ?? record._id ?? ''),
    referenceNumber:
      typeof record.referenceNumber === 'string' ? record.referenceNumber : undefined,
    checkoutId: String(record.checkoutId ?? ''),
    checkoutToken: typeof record.checkoutToken === 'string' ? record.checkoutToken : undefined,
    method: String(record.method ?? '') as PaymentMethod,
    status: String(record.status ?? 'pending') as PaymentStatus,
    amount: Number(record.amount ?? 0),
    currency: String(record.currency ?? 'LKR'),
    redirectUrl: typeof record.redirectUrl === 'string' ? record.redirectUrl : undefined,
    failureReason: typeof record.failureReason === 'string' ? record.failureReason : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

function normalizePaymentStatus(raw: unknown): PaymentStatusResult {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    checkoutToken: String(record.checkoutToken ?? ''),
    status: String(record.status ?? 'pending') as PaymentStatus,
    method: String(record.method ?? ''),
    amount: Number(record.amount ?? 0),
    currency: String(record.currency ?? 'LKR'),
    redirectUrl:
      typeof record.redirectUrl === 'string'
        ? record.redirectUrl
        : record.redirectUrl === null
          ? null
          : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

/** Typed SDK for `/payments/*`. */
export const paymentsApi = {
  async create(payload: PaymentCreatePayload): Promise<PaymentRecord> {
    const raw = await http.post<unknown>('/payments/create', payload);
    return normalizePayment(raw);
  },

  async retry(payload: PaymentRetryPayload): Promise<PaymentRecord> {
    const raw = await http.post<unknown>('/payments/retry', payload);
    return normalizePayment(raw);
  },

  async getStatusByCheckoutToken(checkoutToken: string): Promise<PaymentStatusResult> {
    const raw = await http.get<unknown>(`/payments/status/${checkoutToken}`);
    return normalizePaymentStatus(raw);
  },

  list(params?: ListQueryParams): Promise<PaginatedResult<PaymentRecord>> {
    return http.getPaginated<PaymentRecord>('/payments', { params });
  },

  async getById(id: string): Promise<PaymentRecord> {
    const raw = await http.get<unknown>(`/payments/${id}`);
    return normalizePayment(raw);
  },

  refund(id: string, payload: RefundRequestPayload): Promise<Refund> {
    return http.post<Refund>(`/payments/${id}/refund`, payload);
  },

  listRefunds(id: string): Promise<Refund[]> {
    return http.get<Refund[]>(`/payments/${id}/refunds`);
  },
};
