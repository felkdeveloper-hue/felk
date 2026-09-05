import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import {
  initMetaPixel,
  isMetaPixelConfigured,
  metaPixelTrack,
  normalizeMetaPageViewPath,
  shouldSendMetaPageView,
} from '@/lib/analytics/meta-pixel';
import { collectMetaBrowserParams } from '@/lib/analytics/meta-param-builder';

/**
 * Last path we already sent in this document session.
 * Consecutive same-path only — leaving and coming back must fire again.
 */
let lastPageViewPath: string | null = null;

/** Loads the Meta Pixel once and sends one PageView per SPA pathname change. */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    void collectMetaBrowserParams();
    if (!isMetaPixelConfigured()) return;
    void initMetaPixel();
  }, []);

  useEffect(() => {
    if (!isMetaPixelConfigured()) return;
    const path = normalizeMetaPageViewPath(location.pathname);
    if (!shouldSendMetaPageView(lastPageViewPath, path)) return;
    lastPageViewPath = path;
    void metaPixelTrack('PageView');
  }, [location.pathname]);

  return <>{children}</>;
}
