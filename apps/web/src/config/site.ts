import { env } from './env';

/** Canonical site origin for SEO and JSON-LD. */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL ?? 'https://fe.lk';
}

export function buildAbsoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  if (path.startsWith('http')) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Public-facing brand name — always "Fashion Edge", never the internal app name. */
export const BRAND_NAME = 'Fashion Edge' as const;
export const BRAND_SHORT = 'FE' as const;
export const DEFAULT_SEO_TITLE =
  `${BRAND_NAME} (${BRAND_SHORT}) | Modern Fashion eCommerce — Sri Lanka` as const;

export function formatSeoTitle(pageTitle?: string | null): string {
  const suffix = `${BRAND_NAME} (${BRAND_SHORT})`;
  const normalized = pageTitle?.trim();

  if (
    !normalized ||
    normalized === BRAND_NAME ||
    normalized === BRAND_SHORT ||
    normalized === suffix ||
    normalized === DEFAULT_SEO_TITLE ||
    normalized === `${BRAND_SHORT} | ${BRAND_SHORT}` ||
    normalized === `${BRAND_SHORT} | ${BRAND_NAME}`
  ) {
    return DEFAULT_SEO_TITLE;
  }

  if (normalized.includes('|') && (normalized.includes(BRAND_NAME) || normalized.includes(BRAND_SHORT))) {
    return normalized;
  }

  return `${normalized} | ${suffix}`;
}

export function resolveBrandSiteName(cmsStoreName?: string | null): string {
  const value = cmsStoreName?.trim();
  if (!value || value === BRAND_SHORT || value === 'FE Platform') return BRAND_NAME;
  return value;
}

export const siteConfig = {
  /** Customer-facing store name for SEO and UI copy. */
  name: BRAND_NAME,
  shortName: BRAND_SHORT,
  /** Internal Vite app label (e.g. "FE Platform") — not used in SEO titles. */
  appName: env.appName,
  domain: 'fe.lk',
  defaultTitle: DEFAULT_SEO_TITLE,
  defaultDescription:
    'Fashion Edge (FE) at fe.lk — modern women’s fashion online in Sri Lanka. Shop dresses, tops, jeans, bags & shoes. Stores in Kandy & Colombo. Free styling tips & early access to new drops.',
  defaultOgImagePath: '/og-image.png',
  logoPath: '/favicon.svg',
  searchPath: '/search',
  social: {
    facebook: 'https://www.facebook.com/fashionedge.lk/',
    instagram: 'https://www.instagram.com/fashion__edge__/',
    tiktok: 'https://www.tiktok.com/@fashion_edge_',
  },
  stores: {
    kandy: {
      street: '14A Kotugodella St',
      city: 'Kandy',
      country: 'LK',
      phone: '+94812204315',
    },
    colombo: {
      street: 'No. 76, Galle Road, Bambalapitiya',
      city: 'Colombo',
      country: 'LK',
    },
  },
} as const;
