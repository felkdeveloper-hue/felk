import { env } from '@/config/env';

const R2_DEV_PATH = /^https?:\/\/pub-[a-z0-9]+\.r2\.dev\/(.+)$/i;

function isR2DevHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.r2.dev');
}

/** Bucket object key when `url` is a Cloudflare `*.r2.dev` public URL. */
export function extractR2ObjectKey(url: string): string | undefined {
  const match = url.trim().match(R2_DEV_PATH);
  if (!match?.[1]) return undefined;
  return match[1].replace(/^\/+/, '');
}

/**
 * Ad blockers routinely block `*.r2.dev`, which makes every product photo fail
 * instantly in DevTools (`(failed) net::…`, 0 kB). Serve those files from a
 * first-party path (`/cdn/...`) instead.
 */
export function toStorefrontMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^(data:|blob:)/i.test(trimmed)) return url;

  const key = extractR2ObjectKey(trimmed);
  if (key) {
    const cdn = env.cdnUrl.trim();
    if (cdn) {
      try {
        const cdnHost = new URL(cdn).hostname;
        if (!isR2DevHost(cdnHost)) {
          return `${cdn.replace(/\/$/, '')}/${key}`;
        }
      } catch {
        if (!/\.r2\.dev/i.test(cdn)) {
          return `${cdn.replace(/\/$/, '')}/${key}`;
        }
      }
    }
    return `/cdn/${key}`;
  }

  // API already rewrote to /api/v1/media/... — prefer same-origin /cdn on the shop.
  try {
    const parsed = new URL(trimmed, env.apiOrigin || 'https://api.fe.lk');
    const mediaMatch = parsed.pathname.match(/^\/api\/v1\/media\/(.+)$/);
    if (mediaMatch?.[1] && (!env.apiOrigin || parsed.origin === env.apiOrigin)) {
      return `/cdn/${mediaMatch[1]}`;
    }
  } catch {
    /* ignore */
  }

  return url;
}
