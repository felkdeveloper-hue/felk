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

export const siteConfig = {
  name: env.appName === 'FE' ? 'Fashion Edge' : env.appName,
  shortName: 'FE',
  domain: 'fe.lk',
  defaultDescription:
    'Fashion Edge (fe.lk) — trend-driven women’s clothing online in Sri Lanka. New trends, varieties, and designs from Kandy & Colombo. Shop dresses, tops, jeans, and more.',
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
