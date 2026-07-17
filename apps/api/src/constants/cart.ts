/**
 * Cart Engine constants (Phase 8).
 */

export const CART_PERMISSIONS = {
  CART_VIEW: 'cart.view',
  CART_MANAGE: 'cart.manage',
} as const;

export const CART_ITEM_LOCATION = {
  CART: 'cart',
  SAVED: 'saved',
} as const;

export type CartItemLocation = (typeof CART_ITEM_LOCATION)[keyof typeof CART_ITEM_LOCATION];

export const CART_STATUS = {
  ACTIVE: 'active',
  MERGED: 'merged',
  CONVERTED: 'converted',
  ABANDONED: 'abandoned',
} as const;

export const CART_AUDIT = {
  ITEM_ADDED: 'cart.item_added',
  ITEM_REMOVED: 'cart.item_removed',
  QUANTITY_CHANGED: 'cart.quantity_changed',
  CART_CLEARED: 'cart.cleared',
  CART_MERGED: 'cart.merged',
  SAVED_FOR_LATER: 'cart.saved_for_later',
  RESTORED: 'cart.restored',
} as const;

/** Default cart quantity bounds (per line). */
export const CART_QTY = {
  MIN: 1,
  MAX: 99,
} as const;

/** Header / cookie for anonymous cart identity. */
export const GUEST_CART_HEADER = 'x-guest-cart-token';
export const GUEST_CART_COOKIE = 'fe_guest_cart';
