import { useEffect } from 'react';
import { initMetaPixel, isMetaPixelConfigured } from '@/lib/analytics/meta-pixel';

/** Loads the Meta browser Pixel once for the storefront. */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isMetaPixelConfigured()) return;
    void initMetaPixel();
  }, []);

  return <>{children}</>;
}
