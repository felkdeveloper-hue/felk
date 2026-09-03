import { appConfig } from '@/config/app.config.js';
import { env } from '@/config/env.js';

/**
 * Cloudflare's `*.r2.dev` public host is on common ad-block / tracker lists.
 * Browsers then fail every product image with `(failed) net::ERR_BLOCKED_BY_CLIENT`
 * (0 bytes, a few ms) — which is what shows up as 100+ red Network rows on fe.lk.
 *
 * Keep the real object key, but emit a first-party URL the storefront can load.
 */

const R2_DEV_PATH = /^https?:\/\/pub-[a-z0-9]+\.r2\.dev\/(.+)$/i;

export function isR2DevUrl(value: string): boolean {
  try {
    return /\.r2\.dev$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Object key inside the bucket, or undefined when the URL is not `*.r2.dev`. */
export function extractR2ObjectKey(url: string): string | undefined {
  const match = url.trim().match(R2_DEV_PATH);
  if (!match?.[1]) return undefined;
  return match[1].replace(/^\/+/, '');
}

export function sanitizeStorageKey(rawPath: string): string | null {
  let decoded = rawPath.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  const key = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!key || key.includes('..') || key.length > 1024) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/=-]*$/.test(key)) return null;
  return key;
}

export function rewriteR2DevUrl(url: string, firstPartyBase: string): string {
  const key = extractR2ObjectKey(url);
  if (!key) return url;
  return `${firstPartyBase.replace(/\/$/, '')}/${key}`;
}

/** Origin that is not `*.r2.dev` — custom CDN, or the API media proxy. */
export function firstPartyMediaBase(): string {
  const publicUrl = appConfig.storage.publicUrl?.trim();
  if (publicUrl) {
    try {
      const host = new URL(publicUrl).hostname;
      if (!host.endsWith('.r2.dev')) {
        return publicUrl.replace(/\/$/, '');
      }
    } catch {
      if (!/\.r2\.dev$/i.test(publicUrl)) return publicUrl.replace(/\/$/, '');
    }
  }
  const apiOrigin = env.API_PUBLIC_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  return `${apiOrigin}${env.API_PREFIX}/media`;
}

export function toPublicMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return rewriteR2DevUrl(url, firstPartyMediaBase());
}
