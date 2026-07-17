export const APP_NAME = 'FE Platform' as const;

export const API_VERSION = 'v1' as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
} as const;

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;

export const FILE_UPLOAD = {
  maxSizeMB: 10,
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const,
} as const;

export const AUTH = {
  accessTokenCookie: 'fe_access_token',
  refreshTokenCookie: 'fe_refresh_token',
} as const;
