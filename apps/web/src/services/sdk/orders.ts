import { http } from '@/lib/http-client';
import {
  normalizeInvoice,
  normalizeOrder,
  normalizeReturn,
  normalizeTimelineEntry,
} from '@/utils/orders';
import type { ListQueryParams, PaginatedResult } from '@/types';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'ready_for_shipment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'refund_pending'
  | 'refunded'
  | string;

export interface OrderAddressSnapshot {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantTitle?: string;
  sku: string;
  images: string[];
  thumbnailUrl?: string;
  price: number;
  salePrice?: number;
  discount: number;
  tax: number;
  shipping: number;
  quantity: number;
  lineSubtotal: number;
  lineTotal: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  giftCard?: number;
  grandTotal: number;
  totalQuantity?: number;
  totalWeightGrams?: number;
  currency: string;
}

export interface OrderTrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  currency: string;
  items: OrderLineItem[];
  shippingAddress: OrderAddressSnapshot | null;
  billingAddress: OrderAddressSnapshot | null;
  shippingMethod?: string;
  deliveryMethod?: string;
  totals: OrderTotals;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  placedAt?: string;
  confirmedAt?: string;
  packedAt?: string;
  readyForShipmentAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  tracking?: OrderTrackingInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderTimelineEntry {
  id: string;
  event: string;
  status?: string;
  note?: string;
  actorType: 'user' | 'system';
  createdAt: string;
}

export interface OrderInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  currency: string;
  billingAddress: OrderAddressSnapshot | null;
  shippingAddress: OrderAddressSnapshot | null;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    discount: number;
    tax: number;
    lineTotal: number;
  }>;
  totals: OrderTotals;
  paymentReference: string;
  paymentMethod: string;
  pdf: {
    status: string;
    url: string | null;
    message?: string;
  };
  issuedAt?: string;
}

export interface OrderReturnRequestPayload {
  orderItemId?: string;
  reason: string;
  description?: string;
  images?: string[];
}

export interface OrderReturn {
  id: string;
  orderId: string;
  orderItemId?: string;
  status: string;
  reason: string;
  description?: string;
  images: string[];
  history: Array<{ status: string; note?: string; at: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderListParams extends ListQueryParams {
  status?: OrderStatus;
  q?: string;
  sort?: 'newest' | 'oldest';
}

/** Typed SDK for `/orders/*` (customer-scoped by the backend via permissions). */
export const ordersApi = {
  async list(params?: OrderListParams): Promise<PaginatedResult<Order>> {
    const { sort, ...query } = params ?? {};
    const result = await http.getPaginated<unknown>('/orders', { params: query });
    let data = result.data.map(normalizeOrder);
    if (sort === 'oldest') {
      data = [...data].reverse();
    }
    return { ...result, data };
  },

  async getById(id: string): Promise<Order> {
    const raw = await http.get<unknown>(`/orders/${id}`);
    return normalizeOrder(raw);
  },

  async getByOrderNumber(orderNumber: string): Promise<Order> {
    const raw = await http.get<unknown>(`/orders/number/${orderNumber}`);
    return normalizeOrder(raw);
  },

  async getTimeline(id: string): Promise<OrderTimelineEntry[]> {
    const raw = await http.get<unknown[]>(`/orders/${id}/timeline`);
    return Array.isArray(raw) ? raw.map(normalizeTimelineEntry) : [];
  },

  async cancel(id: string, reason?: string): Promise<Order> {
    const raw = await http.post<unknown>(`/orders/${id}/cancel`, { reason });
    return normalizeOrder(raw);
  },

  async getInvoice(id: string): Promise<OrderInvoice> {
    const raw = await http.get<unknown>(`/orders/${id}/invoice`);
    return normalizeInvoice(raw);
  },

  async requestReturn(id: string, payload: OrderReturnRequestPayload): Promise<OrderReturn> {
    const raw = await http.post<unknown>(`/orders/${id}/return`, payload);
    return normalizeReturn(raw);
  },

  async listReturns(id: string): Promise<OrderReturn[]> {
    const raw = await http.get<unknown[]>(`/orders/${id}/returns`);
    return Array.isArray(raw) ? raw.map(normalizeReturn) : [];
  },
};
