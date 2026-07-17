import { CMS_PERMISSIONS } from '@/constants/cms-permissions';
import { PRODUCT_PERMISSIONS } from '@/constants/product';
import { INVENTORY_PERMISSIONS } from '@/constants/inventory';
import { CUSTOMER_PERMISSIONS } from '@/constants/customer';
import { CART_PERMISSIONS } from '@/constants/cart';
import { CHECKOUT_PERMISSIONS } from '@/constants/checkout';
import { PAYMENT_PERMISSIONS } from '@/constants/payment';
import { ORDER_PERMISSIONS } from '@/constants/order';

/**
 * Full permission catalog.
 * Format: resource.action
 */
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

  /** Legacy — prefer customers.view */
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_BLOCK: 'customers.block',
  SUPPORT_INBOX: 'support.inbox',

  /** Legacy alias — prefer products.view */
  PRODUCTS_READ: 'products.read',

  /** Legacy — prefer warehouse.manage / inventory.view */
  WAREHOUSES_READ: 'warehouses.read',
  WAREHOUSES_MANAGE: 'warehouses.manage',
  INVENTORY_READ: 'inventory.read',

  ORDERS_READ: 'orders.read',
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_REFUND: 'orders.refund',
  ORDERS_EXPORT: 'orders.export',
  ORDERS_READ_OWN: 'orders.read_own',
  ORDERS_CANCEL_OWN: 'orders.cancel_own',

  PAYMENTS_READ: 'payments.read',
  PAYMENTS_RECONCILE: 'payments.reconcile',
  GIFTCARDS_READ: 'giftcards.read',
  GIFTCARDS_MANAGE: 'giftcards.manage',
  COUPONS_READ: 'coupons.read',
  COUPONS_MANAGE: 'coupons.manage',

  REVIEWS_MODERATE: 'reviews.moderate',
  QA_MANAGE: 'qa.manage',

  ANALYTICS_VIEW: 'analytics.view',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  AUDIT_READ: 'audit.read',
  ACTIVITY_READ: 'activity.read',
  NOTIFICATIONS_BROADCAST: 'notifications.broadcast',

  ACCOUNT_READ: 'account.read',
  ACCOUNT_UPDATE: 'account.update',
  REVIEWS_CREATE: 'reviews.create',
  QA_CREATE: 'qa.create',

  CATEGORIES_READ: 'categories.read',
  BRANDS_READ: 'brands.read',
  COLLECTIONS_READ: 'collections.read',

  ...CMS_PERMISSIONS,
  ...PRODUCT_PERMISSIONS,
  ...INVENTORY_PERMISSIONS,
  ...CUSTOMER_PERMISSIONS,
  ...CART_PERMISSIONS,
  ...CHECKOUT_PERMISSIONS,
  ...PAYMENT_PERMISSIONS,
  ...ORDER_PERMISSIONS,
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LIST = Object.values(PERMISSIONS);
