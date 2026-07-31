import type { Request } from 'express';
import type { GeoData } from '@/models/analytics/index.js';

const countryCache = new Map<string, { country: string; countryCode: string; expiresAt: number }>();
const COUNTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Resolves geographic data from request headers.
 * Uses CDN/proxy headers (Cloudflare, Vercel, AWS).
 * Analytics ingest stays header-only (zero latency); login may call {@link resolveCountryFromIp}.
 */
export function resolveGeo(req: Request): GeoData {
  const country =
    (req.headers['cf-ipcountry'] as string | undefined) ??
    (req.headers['x-vercel-ip-country'] as string | undefined) ??
    (req.headers['cloudfront-viewer-country'] as string | undefined) ??
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

function isPrivateOrLocalIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/, '');
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean)
  );
}

/**
 * Best-effort country for login/session metadata when CDN country headers are absent (e.g. bare EC2).
 * Uses a short-timeout public lookup with an in-memory cache. Never throws.
 */
export async function resolveCountryFromIp(
  ip: string | undefined,
): Promise<{ country: string; countryCode: string } | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const key = anonymizeIp(ip);
  const cached = countryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { country: cached.country, countryCode: cached.countryCode };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip.replace(/^::ffff:/, ''))}?fields=status,country,countryCode`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
    };
    if (data.status !== 'success' || !data.countryCode) return null;
    const country = data.country ?? data.countryCode;
    const countryCode = data.countryCode;
    countryCache.set(key, {
      country,
      countryCode,
      expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS,
    });
    return { country, countryCode };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
