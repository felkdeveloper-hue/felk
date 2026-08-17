import { useEffect, useRef } from 'react';
import { initMetaPixel, isMetaPixelConfigured, metaPixelTrack } from '@/lib/analytics/meta-pixel';
import { router } from '@/routes/router';

/** Loads the Meta Pixel once and sends one PageView per SPA route (browser only). */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMetaPixelConfigured()) return;

    const sendPageView = (path: string) => {
      if (lastPathRef.current === path) return;
      lastPathRef.current = path;
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
