import type { Request } from 'express';
import type { GeoData } from '@/models/analytics/index.js';

const countryCache = new Map<string, { country: string; countryCode: string; expiresAt: number }>();
const geoCache = new Map<string, { geo: GeoData; expiresAt: number }>();
const COUNTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Client IP behind Nginx / Cloudflare / ALB.
 * First hop in X-Forwarded-For is the original client when trust proxy is enabled.
 */
export function getClientIp(req: Request): string | undefined {
  const header =
    (typeof req.headers['cf-connecting-ip'] === 'string'
      ? req.headers['cf-connecting-ip']
      : null) ??
    (typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : null) ??
    (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : null);

  if (header) {
    const first = header.split(',')[0]?.trim();
    if (first) return first.replace(/^::ffff:/, '');
  }

  return req.ip?.replace(/^::ffff:/, '');
}

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

async function lookupIpApi(ip: string): Promise<GeoData | null> {
  const key = anonymizeIp(ip);
  const cachedGeo = geoCache.get(key);
  if (cachedGeo && cachedGeo.expiresAt > Date.now()) return cachedGeo.geo;

  const cachedCountry = countryCache.get(key);
  if (cachedCountry && cachedCountry.expiresAt > Date.now() && !geoCache.has(key)) {
    // Country-only cache from a previous lookup — still try full geo below.
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip.replace(/^::ffff:/, ''))}?fields=status,country,countryCode,city,regionName,timezone`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      if (cachedCountry) {
        return {
          country: cachedCountry.country,
          countryCode: cachedCountry.countryCode,
          region: null,
          city: null,
          timezone: null,
        };
      }
      return null;
    }
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
      city?: string;
      regionName?: string;
      timezone?: string;
    };
    if (data.status !== 'success' || !data.countryCode) {
      if (cachedCountry) {
        return {
          country: cachedCountry.country,
          countryCode: cachedCountry.countryCode,
          region: null,
          city: null,
          timezone: null,
        };
      }
      return null;
    }
    const geo: GeoData = {
      country: data.country ?? data.countryCode,
      countryCode: data.countryCode,
      region: data.regionName ?? null,
      city: data.city ?? null,
      timezone: data.timezone ?? null,
    };
    const expiresAt = Date.now() + COUNTRY_CACHE_TTL_MS;
    geoCache.set(key, { geo, expiresAt });
    countryCache.set(key, {
      country: geo.country ?? geo.countryCode ?? data.countryCode,
      countryCode: data.countryCode,
      expiresAt,
    });
    return geo;
  } catch {
    if (cachedCountry) {
      return {
        country: cachedCountry.country,
        countryCode: cachedCountry.countryCode,
        region: null,
        city: null,
        timezone: null,
      };
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort geo from IP when CDN headers are absent (e.g. bare EC2).
 * Never throws; uses ip-api.com with a short timeout and in-memory cache.
 */
export async function resolveGeoFromIp(ip: string | undefined): Promise<GeoData | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;
  return lookupIpApi(ip);
}

/**
 * Best-effort country for login/session metadata when CDN country headers are absent (e.g. bare EC2).
 */
export async function resolveCountryFromIp(
  ip: string | undefined,
): Promise<{ country: string; countryCode: string } | null> {
  const geo = await resolveGeoFromIp(ip);
  if (!geo?.countryCode) return null;
  return {
    country: geo.country ?? geo.countryCode,
    countryCode: geo.countryCode,
  };
}

/**
 * Anonymize an IP address for storage: zero the last octet for IPv4, truncate IPv6.
 * Stores hashed version, not the raw IP.
 */
export function anonymizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.0`;
  const v6parts = ip.replace(/^::ffff:/, '').split(':');
  if (v6parts.length >= 4) return `${v6parts.slice(0, 4).join(':')}::0`;
  return ip;
}
