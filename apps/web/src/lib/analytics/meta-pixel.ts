/** Meta (Facebook) browser Pixel — loads fbevents.js and wraps `fbq`. */

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

type FbqFunction = {
  (command: 'init', pixelId: string): void;
  (
    command: 'track',
    eventName: string,
    params?: Record<string, unknown>,
    options?: { eventID?: string },
  ): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: FbqFunction;
};

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? '1485989443213075';

let initPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.fbq?.loaded) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-meta-pixel="true"]');
    if (existing) {
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

  return initPromise;
}

export function isMetaPixelConfigured(): boolean {
  return Boolean(PIXEL_ID);
}

export async function initMetaPixel(): Promise<void> {
  if (!PIXEL_ID || typeof window === 'undefined') return;
  await loadScript();
  window.fbq?.('init', PIXEL_ID);
}

export async function metaPixelTrack(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string,
): Promise<void> {
  if (!PIXEL_ID || typeof window === 'undefined') return;
  await initMetaPixel();
  if (!window.fbq) return;

  if (eventId) {
    window.fbq('track', eventName, params ?? {}, { eventID: eventId });
  } else {
    window.fbq('track', eventName, params ?? {});
  }
}
