import { http } from '@/lib/http-client';
import { checkoutRef, normalizeCheckoutSession } from '@/utils/checkout';
import type { MessageResult } from '@/types';

export type ShippingMethod = 'standard' | 'express' | 'pickup' | 'free' | string;
export type CheckoutStatus = 'open' | 'reserved' | 'ready' | 'expired' | 'cancelled' | string;

export interface CheckoutAddressSnapshot {
  addressId: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface CheckoutLine {
  cartItemId?: string;
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  salePrice?: number;
  compareAtPrice?: number;
  lineSubtotal: number;
  colorName?: string;
  sizeName?: string;
  thumbnailUrl?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  giftCard?: number;
  grandTotal: number;
  totalQuantity?: number;
  currency: string;
}

export interface CheckoutValidationIssue {
  code?: string;
  message: string;
  severity?: 'error' | 'warning';
  variantId?: string;
}

export interface CheckoutSession {
  id: string;
  checkoutToken: string;
  status: CheckoutStatus;
  currency: string;
  lines: CheckoutLine[];
  shippingAddress: CheckoutAddressSnapshot | null;
  billingAddress: CheckoutAddressSnapshot | null;
  shippingMethod: ShippingMethod;
  deliveryMethod?: string;
  shippingEstimate?: Record<string, unknown>;
  taxEstimate?: Record<string, unknown>;
  coupon?: Record<string, unknown>;
  giftCard?: Record<string, unknown>;
  totals: CheckoutTotals;
  reservationExpiresAt?: string | null;
  expiresAt?: string | null;
  validationIssues?: CheckoutValidationIssue[];
  readyForPayment?: boolean;
  valid?: boolean;
  issues?: CheckoutValidationIssue[];
}

export interface CheckoutStartPayload {
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethod?: ShippingMethod;
  deliveryMethod?: 'delivery' | 'pickup';
  couponCode?: string;
  giftCardCode?: string;
  autoReserve?: boolean;
}

export interface CheckoutRefreshPayload {
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethod?: ShippingMethod;
  deliveryMethod?: 'delivery' | 'pickup';
  couponCode?: string | null;
  giftCardCode?: string | null;
  extendReservation?: boolean;
}

/** Typed SDK for `/checkout/*`. */
export const checkoutApi = {
  async start(payload: CheckoutStartPayload): Promise<CheckoutSession> {
    const raw = await http.post<unknown>('/checkout/start', payload);
    return normalizeCheckoutSession(raw);
  },

  async validate(checkoutRefId: string): Promise<CheckoutSession> {
    const raw = await http.post<unknown>('/checkout/validate', checkoutRef(checkoutRefId));
    return normalizeCheckoutSession(raw);
  },

  async reserve(checkoutRefId: string): Promise<CheckoutSession> {
    const raw = await http.post<unknown>('/checkout/reserve', checkoutRef(checkoutRefId));
    return normalizeCheckoutSession(raw);
  },

  async release(checkoutRefId: string): Promise<CheckoutSession> {
    const raw = await http.post<unknown>('/checkout/release', checkoutRef(checkoutRefId));
    return normalizeCheckoutSession(raw);
  },

  async refresh(checkoutRefId: string, payload: CheckoutRefreshPayload): Promise<CheckoutSession> {
    const raw = await http.post<unknown>('/checkout/refresh', {
      ...checkoutRef(checkoutRefId),
      ...payload,
    });
    return normalizeCheckoutSession(raw);
  },

  async cancel(checkoutRefId: string): Promise<MessageResult> {
    return http.delete<MessageResult>('/checkout/cancel', { data: checkoutRef(checkoutRefId) });
  },

  async getById(idOrToken: string): Promise<CheckoutSession> {
    const raw = await http.get<unknown>(`/checkout/${idOrToken}`);
    return normalizeCheckoutSession(raw);
  },
};
