/**
 * Checkout Engine constants (Phase 9).
 */

export const CHECKOUT_PERMISSIONS = {
  CHECKOUT_MANAGE: 'checkout.manage',
  CHECKOUT_VIEW: 'checkout.view',
} as const;

export const CHECKOUT_STATUS = {
  OPEN: 'open',
  RESERVED: 'reserved',
  READY: 'ready',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type CheckoutStatus = (typeof CHECKOUT_STATUS)[keyof typeof CHECKOUT_STATUS];

export const SHIPPING_METHOD = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  PICKUP: 'pickup',
  FREE: 'free',
} as const;

export type ShippingMethod = (typeof SHIPPING_METHOD)[keyof typeof SHIPPING_METHOD];

export const DELIVERY_METHOD = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
} as const;

/** Flat island-wide delivery fee (LKR). */
export const FIXED_SHIPPING_AMOUNT = 500;

/** Payable product worth (LKR, after discounts) at which standard delivery becomes free. */
export const FREE_SHIPPING_THRESHOLD = 5000;

/** Product amount that counts toward free delivery — list price minus discounts. */
export function productWorthForFreeDelivery(subtotal: number, discount = 0): number {
  return Number(
    Math.max(0, (Number(subtotal) || 0) - Math.max(0, Number(discount) || 0)).toFixed(2),
  );
}

export function isFreeDeliveryUnlocked(productWorth: number): boolean {
  return Number(productWorth) >= FREE_SHIPPING_THRESHOLD;
}

/** Remaining merchandise value needed to unlock free delivery (LKR). */
export function remainingForFreeDelivery(subtotal: number): number {
  const remaining = FREE_SHIPPING_THRESHOLD - Math.max(0, Number(subtotal) || 0);
  return Number(Math.max(0, remaining).toFixed(2));
}

/**
 * Shipping fee used by checkout / payments.
 * Pickup and staff waivers stay free; otherwise LKR 500 unless product worth ≥ 5,000.
 */
export function shippingFeeForSubtotal(
  subtotal: number,
  opts?: { waiveFee?: boolean; pickup?: boolean },
): number {
  if (opts?.waiveFee || opts?.pickup) return 0;
  if (isFreeDeliveryUnlocked(subtotal)) return 0;
  return FIXED_SHIPPING_AMOUNT;
}

/** Payment-window reservation TTL (minutes). Stock is held only after Place Order. */
export const CHECKOUT_RESERVATION_TTL_MINUTES = 10;

/** Auto-applied for every customer with no prior paid/active orders. */
export const FIRST_ORDER_DISCOUNT = {
  CODE: 'FIRSTORDER5',
  PERCENT: 5,
  LABEL: '5% off your first order',
} as const;

/** Personal flash sale — 20% off eligible items for 60 minutes (guest IP/cookie + member). */
export const FLASH_SALE_DISCOUNT = {
  CODE: 'FLASH20',
  PERCENT: 20,
  LABEL: 'Flash Sale — 20% OFF',
  DURATION_MS: 60 * 60 * 1000,
  /** Category slugs excluded from the extra 20% off. */
  EXCLUDED_CATEGORY_SLUGS: ['shoes'] as readonly string[],
} as const;

export const CHECKOUT_AUDIT = {
  STARTED: 'checkout.started',
  RESERVATION_CREATED: 'checkout.reservation_created',
  RESERVATION_RELEASED: 'checkout.reservation_released',
  RESERVATION_EXPIRED: 'checkout.reservation_expired',
  CANCELLED: 'checkout.cancelled',
  COMPLETED: 'checkout.completed',
  REFRESHED: 'checkout.refreshed',
  VALIDATED: 'checkout.validated',
} as const;
