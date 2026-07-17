/**
 * Product catalog permissions (Phase 5).
 */
export const PRODUCT_PERMISSIONS = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_PUBLISH: 'products.publish',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_EXPORT: 'products.export',
  PRODUCTS_IMPORT: 'products.import',
  ATTRIBUTES_VIEW: 'attributes.view',
  ATTRIBUTES_MANAGE: 'attributes.manage',
} as const;

export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
  SCHEDULED: 'scheduled',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const PRODUCT_VISIBILITY = {
  PUBLIC: 'public',
  HIDDEN: 'hidden',
  CATALOG_ONLY: 'catalog_only',
} as const;

export const VARIANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export const RELATIONSHIP_TYPES = {
  RELATED: 'related',
  CROSS_SELL: 'cross_sell',
  UPSELL: 'upsell',
  FBT: 'frequently_bought_together',
  RECOMMENDED: 'recommended',
} as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  IMAGE_360: '360',
} as const;

export const PRODUCT_AUDIT = {
  CREATED: 'products.created',
  UPDATED: 'products.updated',
  PUBLISHED: 'products.published',
  DELETED: 'products.deleted',
  PRICE_CHANGED: 'products.price_changed',
  VARIANT_ADDED: 'products.variant_added',
  VARIANT_REMOVED: 'products.variant_removed',
  SEO_CHANGED: 'products.seo_changed',
  MEDIA_ADDED: 'products.media_added',
  DUPLICATED: 'products.duplicated',
} as const;
