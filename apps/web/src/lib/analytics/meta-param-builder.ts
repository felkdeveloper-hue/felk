import { hasMarketingConsent } from '@/lib/analytics/consent';

const META_CLICK_ID = /^fb\./;

type ClientParamBuilder = {
  processAndCollectAllParams: (
    url?: string | null,
    getIpFn?: (() => string | Promise<string>) | null,
  ) => Promise<Record<string, string | null | undefined>>;
  getFbc: () => string | null | undefined;
  getFbp: () => string | null | undefined;
};

let sdkPromise: Promise<ClientParamBuilder | null> | null = null;
let collected = false;
let collectPromise: Promise<void> | null = null;

function sanitizeClickId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !META_CLICK_ID.test(trimmed)) return null;
  return trimmed;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function loadSdk(): Promise<ClientParamBuilder | null> {
  if (typeof window === 'undefined') return null;
  if (sdkPromise) return sdkPromise;

  sdkPromise = import('meta-capi-param-builder-clientjs')
    .then((mod) => {
      const candidate = (mod as { default?: unknown }).default ?? mod;
      const sdk = candidate as Partial<ClientParamBuilder>;
      if (typeof sdk.processAndCollectAllParams !== 'function') return null;
      if (typeof sdk.getFbc !== 'function' || typeof sdk.getFbp !== 'function') return null;
      return sdk as ClientParamBuilder;
    })
    .catch(() => null);

  return sdkPromise;
}

/**
 * Capture/preserve `_fbp` and `_fbc` on the shop domain as early as possible.
 * Does not load a second Pixel and does not fetch a client IP from third parties.
 */
export async function collectMetaBrowserParams(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!hasMarketingConsent()) return;
  if (collected) return;
  if (collectPromise) return collectPromise;

  collectPromise = (async () => {
    const sdk = await loadSdk();
    if (!sdk) return;
    try {
      await sdk.processAndCollectAllParams(window.location.href);
      collected = true;
    } catch {
      collected = true;
    }
  })();

  return collectPromise;
}

export function getMetaFbp(): string | null {
  return sanitizeClickId(readCookie('_fbp'));
}

export function getMetaFbc(): string | null {
  return sanitizeClickId(readCookie('_fbc'));
}

/** Browser click IDs to attach to auth / CAPI requests. Never mutates values. */
export function getMetaClickPayload(): { fbp?: string; fbc?: string } {
  const fbp = getMetaFbp();
  const fbc = getMetaFbc();
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}
