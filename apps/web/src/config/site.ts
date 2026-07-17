import { env } from './env';

/** Canonical site origin for SEO and JSON-LD. */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173';
}

export function buildAbsoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  if (path.startsWith('http')) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export const siteConfig = {
  name: env.appName,
  defaultDescription: 'Discover curated fashion collections from FE.',
  searchPath: '/search',
} as const;
