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

/** Payment-window reservation TTL (minutes). Stock is held only after Place Order. */
export const CHECKOUT_RESERVATION_TTL_MINUTES = 10;

/** Auto-applied for every customer with no prior paid/active orders. */
export const FIRST_ORDER_DISCOUNT = {
  CODE: 'FIRSTORDER5',
  PERCENT: 5,
  LABEL: '5% off your first order',
} as const;

/** Member flash sale — 20% off eligible items for 60 minutes after login/grant. */
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
