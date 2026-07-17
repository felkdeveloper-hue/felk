import { http } from '@/lib/http-client';
import { normalizeCartView } from '@/utils/cart';

export interface CartLineItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
  colorName?: string;
  sizeName?: string;
  salePrice?: number;
  compareAtPrice?: number;
  priceChanged?: boolean;
  priceDifference?: number;
  currency?: string;
  price?: { amount: number; currency: string };
  salePriceMoney?: { amount: number; currency: string };
  inStock?: boolean;
  stockStatus?: string;
  [key: string]: unknown;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  totalQuantity?: number;
  itemCount?: number;
  taxEstimate?: Record<string, unknown>;
  shippingEstimate?: Record<string, unknown>;
}

export interface CartView {
  id: string;
  items: CartLineItem[];
  totals: CartTotals;
  guestCartToken?: string;
  savedItems?: CartLineItem[];
  validation?: CartValidationResult;
  status?: string;
  [key: string]: unknown;
}

export interface CartAddItemPayload {
  variantId: string;
  quantity?: number;
  warehouseId?: string;
}

export interface CartUpdateItemPayload {
  quantity: number;
  warehouseId?: string;
}

export interface CartValidationIssue {
  itemId?: string;
  variantId?: string;
  reason: string;
  code?: string;
  severity?: 'error' | 'warning';
}

export interface CartValidationResult {
  isValid: boolean;
  issues?: CartValidationIssue[];
}

/** Typed SDK for `/cart/*`. Works for both guest and authenticated carts. */
export const cartApi = {
  async get(): Promise<CartView> {
    const raw = await http.get<unknown>('/cart');
    return normalizeCartView(raw);
  },

  async addItem(payload: CartAddItemPayload): Promise<CartView> {
    const raw = await http.post<unknown>('/cart/items', payload);
    return normalizeCartView(raw);
  },

  async updateItem(itemId: string, payload: CartUpdateItemPayload): Promise<CartView> {
    const raw = await http.patch<unknown>(`/cart/items/${itemId}`, payload);
    return normalizeCartView(raw);
  },

  async removeItem(itemId: string): Promise<CartView> {
    const raw = await http.delete<unknown>(`/cart/items/${itemId}`);
    return normalizeCartView(raw);
  },

  async merge(guestCartToken: string): Promise<CartView> {
    const raw = await http.post<unknown>('/cart/merge', { guestCartToken });
    return normalizeCartView(raw);
  },

  async saveForLater(itemIds: string[]): Promise<CartView> {
    const raw = await http.post<unknown>('/cart/save-for-later', { itemIds });
    return normalizeCartView(raw);
  },

  async restore(itemIds: string[]): Promise<CartView> {
    const raw = await http.post<unknown>('/cart/restore', { itemIds });
    return normalizeCartView(raw);
  },

  async clear(): Promise<CartView> {
    const raw = await http.delete<unknown>('/cart/clear');
    return normalizeCartView(raw);
  },

  async validate(): Promise<CartView> {
    const raw = await http.post<unknown>('/cart/validate');
    return normalizeCartView(raw);
  },
};
