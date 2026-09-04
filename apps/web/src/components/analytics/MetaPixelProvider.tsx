import { useEffect } from 'react';
import {
  initMetaPixel,
  isMetaPixelConfigured,
  metaPixelTrack,
  normalizeMetaPageViewPath,
} from '@/lib/analytics/meta-pixel';
import { collectMetaBrowserParams } from '@/lib/analytics/meta-param-builder';
import { router } from '@/routes/router';

/** Survives remounts. Same normalized path is never sent twice. */
let lastPageViewPath: string | null = null;
let pixelReady = false;

function sendPageView(path: string) {
  const normalized = normalizeMetaPageViewPath(path);
  if (lastPageViewPath === normalized) return;
  lastPageViewPath = normalized;
  void metaPixelTrack('PageView');
}

/** Loads the Meta Pixel once and sends one PageView per SPA route (browser only). */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void collectMetaBrowserParams();

    if (!isMetaPixelConfigured()) return;

    let cancelled = false;

    void initMetaPixel().then(() => {
      if (cancelled) return;
      pixelReady = true;
      sendPageView(router.state.location.pathname);
    });

    const unsubscribe = router.subscribe('onResolved', () => {
      if (!pixelReady) return;
      sendPageView(router.state.location.pathname);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
