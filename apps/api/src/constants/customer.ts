/**
 * Customer domain constants (Phase 7).
 */

export const CUSTOMER_PERMISSIONS = {
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_NOTES: 'customers.notes',
  CUSTOMERS_TAGS: 'customers.tags',
  WISHLIST_MANAGE: 'wishlist.manage',
  ADDRESSES_MANAGE: 'addresses.manage',
} as const;

export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  PENDING: 'pending',
} as const;

export type CustomerStatus = (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];

export const ADDRESS_TYPE = {
  BILLING: 'billing',
  SHIPPING: 'shipping',
  BOTH: 'both',
} as const;

export const ADDRESS_LABEL = {
  HOME: 'home',
  OFFICE: 'office',
  OTHER: 'other',
} as const;

export const WISHLIST_VISIBILITY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  SHARED: 'shared',
} as const;

export const LOYALTY_TIER = {
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const;

export const REFERRAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REWARDED: 'rewarded',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export const REWARD_TX_TYPE = {
  EARN: 'earn',
  REDEEM: 'redeem',
  ADJUST: 'adjust',
  EXPIRE: 'expire',
} as const;

export const CUSTOMER_AUDIT = {
  PROFILE_UPDATED: 'customers.profile_updated',
  ADDRESS_ADDED: 'customers.address_added',
  ADDRESS_DELETED: 'customers.address_deleted',
  WISHLIST_CREATED: 'customers.wishlist_created',
  WISHLIST_DELETED: 'customers.wishlist_deleted',
  PREFERENCES_CHANGED: 'customers.preferences_changed',
  NOTE_ADDED: 'customers.note_added',
  TAGS_CHANGED: 'customers.tags_changed',
  CUSTOMER_CREATED: 'customers.created',
  CUSTOMER_DELETED: 'customers.deleted',
} as const;

/** Max recently viewed rows kept per customer. */
export const RECENTLY_VIEWED_LIMIT = 50;

/** System tag keys (seeded examples). */
export const SYSTEM_CUSTOMER_TAGS = [
  'vip',
  'wholesale',
  'blocked',
  'employee',
  'influencer',
] as const;
