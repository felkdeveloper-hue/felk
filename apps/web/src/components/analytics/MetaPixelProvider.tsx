import { useEffect } from 'react';
import { initMetaPixel, isMetaPixelConfigured, metaPixelTrack } from '@/lib/analytics/meta-pixel';
import { collectMetaBrowserParams } from '@/lib/analytics/meta-param-builder';
import { router } from '@/routes/router';

/** Survives React Strict Mode remounts so the same path is not sent twice. */
let lastPageViewPath: string | null = null;

/** Loads the Meta Pixel once and sends one PageView per SPA route (browser only). */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void collectMetaBrowserParams();

    if (!isMetaPixelConfigured()) return;

    const sendPageView = (path: string) => {
      if (lastPageViewPath === path) return;
      lastPageViewPath = path;
      void metaPixelTrack('PageView');
    };

    void initMetaPixel().then(() => {
      sendPageView(window.location.pathname);
    });

    const unsubscribe = router.subscribe('onResolved', () => {
      sendPageView(window.location.pathname);
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
}
