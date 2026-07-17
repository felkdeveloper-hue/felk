/**
 * Central route path registry. Keep in sync with `src/routes/`.
 */
export const ROUTES = {
  home: '/',
  auth: '/auth',
  authLogin: '/auth/login',
  authRegister: '/auth/register',
  authVerifyEmail: '/auth/verify-email',
  authForgotPassword: '/auth/forgot-password',
  authResetPassword: '/auth/reset-password',
  account: '/account',
  accountProfile: '/account/profile',
  accountSecurity: '/account/security',
  accountAddresses: '/account/addresses',
  accountPreferences: '/account/preferences',
  accountOrders: '/account/orders',
  accountReturns: '/account/returns',
  products: '/products',
  categories: '/categories',
  search: '/search',
  cart: '/cart',
  wishlist: '/wishlist',
  checkout: '/checkout',
  checkoutShipping: '/checkout/shipping',
  checkoutPayment: '/checkout/payment',
  checkoutReview: '/checkout/review',
  checkoutSuccess: '/checkout/success',
  checkoutCancel: '/checkout/cancel',
  /** @deprecated Use ROUTES.accountOrders */
  orders: '/account/orders',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  notFound: '/not-found',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
