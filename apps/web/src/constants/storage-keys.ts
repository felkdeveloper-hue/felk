/**
 * localStorage / sessionStorage key registry. Prefixed to avoid collisions
 * with other apps sharing the same origin during local development.
 */
export const STORAGE_KEYS = {
  authSession: 'fe.auth.session',
  cart: 'fe.cart.state',
  checkout: 'fe.checkout.state',
  theme: 'fe.theme.preferences',
  ui: 'fe.ui.state',
  notifications: 'fe.notifications.state',
  guestCartToken: 'fe.cart.guest-token',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
