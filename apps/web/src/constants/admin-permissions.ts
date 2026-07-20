/** Mirrors backend permission keys used for RBAC checks in the admin UI. */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_LOCK: 'users.lock',
  USERS_MANAGE: 'users.manage',

  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_READ: 'permissions.read',

  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_PUBLISH: 'products.publish',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_EXPORT: 'products.export',
  PRODUCTS_IMPORT: 'products.import',

  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',
  CATEGORIES_MANAGE: 'categories.manage',

  BRANDS_VIEW: 'brands.view',
  BRANDS_CREATE: 'brands.create',
  BRANDS_UPDATE: 'brands.update',
  BRANDS_DELETE: 'brands.delete',
  BRANDS_MANAGE: 'brands.manage',

  COLLECTIONS_VIEW: 'collections.view',
  COLLECTIONS_CREATE: 'collections.create',
  COLLECTIONS_UPDATE: 'collections.update',
  COLLECTIONS_DELETE: 'collections.delete',
  COLLECTIONS_MANAGE: 'collections.manage',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_RESERVE: 'inventory.reserve',
  INVENTORY_EXPORT: 'inventory.export',
  WAREHOUSE_MANAGE: 'warehouse.manage',

  ORDERS_READ: 'orders.read',
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_EXPORT: 'orders.export',
  ORDERS_NOTES: 'orders.notes',
  ORDERS_INVOICE: 'orders.invoice',
  ORDERS_RETURN_MANAGE: 'orders.return_manage',

  REVIEWS_MODERATE: 'reviews.moderate',
  REVIEWS_CREATE: 'reviews.create',

  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_NOTES: 'customers.notes',
  CUSTOMERS_TAGS: 'customers.tags',

  CMS_VIEW: 'cms.view',
  CMS_MANAGE: 'cms.manage',
  BANNERS_VIEW: 'banners.view',
  BANNERS_MANAGE: 'banners.manage',
  PAGES_VIEW: 'pages.view',
  PAGES_MANAGE: 'pages.manage',
  FAQS_VIEW: 'faqs.view',
  FAQS_MANAGE: 'faqs.manage',
  MARKETING_VIEW: 'marketing.view',
  MARKETING_MANAGE: 'marketing.manage',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_REFUND: 'payments.refund',
  PAYMENTS_EXPORT: 'payments.export',
  PAYMENTS_MANAGE: 'payments.manage',
  PAYMENTS_RECONCILE: 'payments.reconcile',

  COUPONS_READ: 'coupons.read',
  COUPONS_MANAGE: 'coupons.manage',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  ANALYTICS_VIEW: 'analytics.view',

  AUDIT_READ: 'audit.read',
  ACTIVITY_READ: 'activity.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const STAFF_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'inventory_manager',
  'marketing_manager',
  'customer_support',
  'finance',
  'warehouse_staff',
] as const;
