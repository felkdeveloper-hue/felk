/** Meta (Facebook) browser Pixel — official fbevents.js wrapper. */

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

type FbqFunction = {
  (command: 'init', pixelId: string): void;
  (command: 'set', key: 'autoConfig', value: boolean, pixelId: string): void;
  (
    command: 'track' | 'trackSingle',
    eventNameOrPixelId: string,
    eventNameOrParams?: string | Record<string, unknown>,
    paramsOrOptions?: Record<string, unknown> | { eventID?: string },
    options?: { eventID?: string },
  ): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: FbqFunction;
  /** Prevents fbevents.js from auto-sending PageView on history.pushState. */
  disablePushState?: boolean;
};

/** One PageView key per route — trailing slashes and query/hash do not count as new pages. */
export function normalizeMetaPageViewPath(path: string): string {
  const raw = (path.split('?')[0] ?? '').split('#')[0] ?? '';
  if (!raw || raw === '/') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? '1485989443213075';

const TEST_CODE_STORAGE_KEY = 'meta_test_event_code';
const TEST_CODE_PATTERN = /^TEST\d{3,12}$/i;

let scriptPromise: Promise<void> | null = null;
let pixelInitialized = false;
let initPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-meta-pixel="true"]');
    if (existing && window.fbq) {
      resolve();
      return;
    }

    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue?.push(args);
      }
    } as FbqFunction;

    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    // Must be set on the stub BEFORE fbevents.js loads — it patches history at evaluate time.
    fbq.disablePushState = true;
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.dataset.metaPixel = 'true';
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function isMetaPixelConfigured(): boolean {
  return Boolean(META_PIXEL_ID);
}

/** Persist the Test Events code from the current URL so CAPI matches Events Manager. */
export function captureMetaTestEventCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('test_event_code') ?? params.get('meta_test_code');
    if (fromUrl && TEST_CODE_PATTERN.test(fromUrl)) {
      const normalized = fromUrl.toUpperCase();
      sessionStorage.setItem(TEST_CODE_STORAGE_KEY, normalized);
      return normalized;
    }
    const stored = sessionStorage.getItem(TEST_CODE_STORAGE_KEY);
    return stored && TEST_CODE_PATTERN.test(stored) ? stored.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function getMetaTestEventCode(): string | null {
  if (typeof window === 'undefined') return null;
  const fromEnv = import.meta.env.VITE_META_TEST_EVENT_CODE;
  if (typeof fromEnv === 'string' && TEST_CODE_PATTERN.test(fromEnv)) {
    return fromEnv.toUpperCase();
  }
  return captureMetaTestEventCode();
}

export async function initMetaPixel(): Promise<void> {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;
  captureMetaTestEventCode();
  if (pixelInitialized) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    await loadScript();
    if (pixelInitialized || !window.fbq) return;

    // Meta docs: disable automatic button/microdata events BEFORE init.
    window.fbq.disablePushState = true;
    window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
    window.fbq('init', META_PIXEL_ID);
    pixelInitialized = true;
  })();

  await initPromise;
}

export async function metaPixelTrack(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string,
): Promise<void> {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;
  await initMetaPixel();
  if (!window.fbq) return;

  const data = params ?? {};
  if (eventId) {
    window.fbq('trackSingle', META_PIXEL_ID, eventName, data, { eventID: eventId });
  } else {
    window.fbq('trackSingle', META_PIXEL_ID, eventName, data);
  }
}
