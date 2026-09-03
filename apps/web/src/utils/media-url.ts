import { env } from '@/config/env';

const R2_DEV_PATH = /^https?:\/\/pub-[a-z0-9]+\.r2\.dev\/(.+)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(?:$|\?)/i;
/** Must match `apps/web/vercel.json` /cdn rewrite target. */
const DEFAULT_R2_PUBLIC_ORIGIN = 'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev';

function isR2DevHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.r2.dev');
}

function r2PublicOrigin(): string {
  const cdn = env.cdnUrl.trim();
  if (cdn) {
    try {
      const url = new URL(cdn);
      if (isR2DevHost(url.hostname)) return url.origin;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_R2_PUBLIC_ORIGIN;
}

function isVideoMediaPath(pathOrUrl: string): boolean {
  try {
    const path = pathOrUrl.includes('://')
      ? new URL(pathOrUrl).pathname
      : (pathOrUrl.split('?')[0] ?? pathOrUrl);
    return VIDEO_EXT.test(path);
  } catch {
    return VIDEO_EXT.test(pathOrUrl);
  }
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
 *
 * Exception: video. Vercel’s `/cdn` external rewrite caches Range responses by
 * URL only, so a tiny `bytes=0-1` probe can poison the edge cache and every
 * subsequent `<video>` request returns 2 bytes (gray lookbook panels). Keep
 * videos on the R2 public origin (they worked there before the CDN proxy).
 */
export function toStorefrontMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^(data:|blob:)/i.test(trimmed)) return url;

  // Escape already-rewritten /cdn video URLs that may be stuck on a poisoned
  // Vercel Range cache entry after the CDN media proxy rollout.
  if (trimmed.startsWith('/cdn/') && isVideoMediaPath(trimmed)) {
    return `${r2PublicOrigin()}/${trimmed.slice('/cdn/'.length).replace(/^\/+/, '')}`;
  }

  const key = extractR2ObjectKey(trimmed);
  if (key) {
    if (isVideoMediaPath(key)) {
      return trimmed;
    }
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

  // API already rewrote to /api/v1/media/... — prefer same-origin /cdn on the shop
  // for images only (videos stay on the API origin or R2).
  try {
    const parsed = new URL(trimmed, env.apiOrigin || 'https://api.fe.lk');
    const mediaMatch = parsed.pathname.match(/^\/api\/v1\/media\/(.+)$/);
    if (mediaMatch?.[1] && (!env.apiOrigin || parsed.origin === env.apiOrigin)) {
      const mediaKey = mediaMatch[1];
      if (isVideoMediaPath(mediaKey)) {
        return `${r2PublicOrigin()}/${mediaKey}`;
      }
      return `/cdn/${mediaKey}`;
    }
  } catch {
    /* ignore */
  }

  return url;
}
