import type { Request } from 'express';
import type { GeoData } from '@/models/analytics/index.js';

/**
 * Resolves geographic data from request headers.
 * Uses CDN/proxy headers (Cloudflare, Vercel, AWS) with Accept-Language fallback.
 * No external IP lookup calls in Phase 1 — zero latency impact on ingest.
 */
export function resolveGeo(req: Request): GeoData {
  const country =
    (req.headers['cf-ipcountry'] as string | undefined) ??
    (req.headers['x-vercel-ip-country'] as string | undefined) ??
    (req.headers['x-country-code'] as string | undefined) ??
    null;

  const region =
    (req.headers['cf-region-code'] as string | undefined) ??
    (req.headers['x-vercel-ip-country-region'] as string | undefined) ??
    null;

  const city =
    (req.headers['cf-ipcity'] as string | undefined) ??
    (req.headers['x-vercel-ip-city'] as string | undefined) ??
    null;

  const timezone =
    (req.headers['cf-timezone'] as string | undefined) ??
    (req.headers['x-vercel-ip-timezone'] as string | undefined) ??
    null;

  return {
    country: country ? decodeURIComponent(country) : null,
    countryCode: country ?? null,
    region: region ? decodeURIComponent(region) : null,
    city: city ? decodeURIComponent(city) : null,
    timezone: timezone ? decodeURIComponent(timezone) : null,
  };
}

/**
 * Anonymize an IP address for storage: zero the last octet for IPv4, truncate IPv6.
 * Stores hashed version, not the raw IP.
 */
export function anonymizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  // IPv4 — zero last octet
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.0`;
  // IPv6 — keep first 4 groups
  const v6parts = ip.replace(/^::ffff:/, '').split(':');
  if (v6parts.length >= 4) return `${v6parts.slice(0, 4).join(':')}::0`;
  return ip;
}
