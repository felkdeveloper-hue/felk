/**
 * Admin route paths — keep in sync with `src/routes/admin.routes.tsx`.
 */
export const ADMIN_ROUTES = {
  root: '/admin',
  dashboard: '/admin/dashboard',
  products: '/admin/products',
  productNew: '/admin/products/new',
  productDetail: '/admin/products/$productId',
  categories: '/admin/categories',
  categoryDetail: '/admin/categories/$categoryId',
  collections: '/admin/collections',
  brands: '/admin/brands',
  sizes: '/admin/sizes',
  occasions: '/admin/occasions',
  inventory: '/admin/inventory',
  orders: '/admin/orders',
  orderDetail: '/admin/orders/$orderId',
  customers: '/admin/customers',
  customerDetail: '/admin/customers/$customerId',
  finance: '/admin/finance',
  reports: '/admin/reports',
  users: '/admin/users',
  roles: '/admin/roles',
  settings: '/admin/settings',
  audit: '/admin/audit',
  forbidden: '/admin/forbidden',
} as const;

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
