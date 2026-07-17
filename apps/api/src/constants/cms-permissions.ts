/**
 * CMS / Master-data permissions (Phase 3).
 * Format: resource.action
 */
export const CMS_PERMISSIONS = {
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',
  CATEGORIES_MANAGE: 'categories.manage',

  // Brands
  BRANDS_VIEW: 'brands.view',
  BRANDS_CREATE: 'brands.create',
  BRANDS_UPDATE: 'brands.update',
  BRANDS_DELETE: 'brands.delete',
  BRANDS_MANAGE: 'brands.manage',

  // Collections
  COLLECTIONS_VIEW: 'collections.view',
  COLLECTIONS_CREATE: 'collections.create',
  COLLECTIONS_UPDATE: 'collections.update',
  COLLECTIONS_DELETE: 'collections.delete',
  COLLECTIONS_MANAGE: 'collections.manage',

  // Colors / Sizes / Materials / Tags / Occasions / Seasons
  COLORS_VIEW: 'colors.view',
  COLORS_MANAGE: 'colors.manage',
  SIZES_VIEW: 'sizes.view',
  SIZES_MANAGE: 'sizes.manage',
  MATERIALS_VIEW: 'materials.view',
  MATERIALS_MANAGE: 'materials.manage',
  TAGS_VIEW: 'tags.view',
  TAGS_MANAGE: 'tags.manage',
  OCCASIONS_VIEW: 'occasions.view',
  OCCASIONS_MANAGE: 'occasions.manage',
  SEASONS_VIEW: 'seasons.view',
  SEASONS_MANAGE: 'seasons.manage',

  // CMS content
  CMS_VIEW: 'cms.view',
  CMS_MANAGE: 'cms.manage',
  BANNERS_VIEW: 'banners.view',
  BANNERS_MANAGE: 'banners.manage',
  PAGES_VIEW: 'pages.view',
  PAGES_MANAGE: 'pages.manage',
  BLOGS_VIEW: 'blogs.view',
  BLOGS_MANAGE: 'blogs.manage',
  BLOGS_PUBLISH: 'blogs.publish',
  FAQS_VIEW: 'faqs.view',
  FAQS_MANAGE: 'faqs.manage',
  MARKETING_VIEW: 'marketing.view',
  MARKETING_MANAGE: 'marketing.manage',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_READ: 'settings.read',
  SETTINGS_MANAGE: 'settings.manage',
  SHIPPING_VIEW: 'shipping.view',
  SHIPPING_MANAGE: 'shipping.manage',
  TAX_VIEW: 'tax.view',
  TAX_MANAGE: 'tax.manage',
  CURRENCY_VIEW: 'currency.view',
  CURRENCY_MANAGE: 'currency.manage',
  TEMPLATES_VIEW: 'templates.view',
  TEMPLATES_MANAGE: 'templates.manage',
} as const;

export type CmsPermissionKey = (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];
