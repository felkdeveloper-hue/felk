import { useEffect } from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { OfflineBanner } from '@/components/feedback/offline-banner';
import { AnnouncementBar } from '@/components/storefront/announcement-bar';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SkipToContent } from '@/components/navigation/skip-to-content';
import { CartBootstrap } from '@/components/cart';
import { LiveRegion } from '@/components/commerce/live-region';
import { trackingApi } from '@/services/sdk/tracking';

/** Shell for all public, unauthenticated storefront pages. */
export function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    const send = () => {
      void trackingApi.pageView(window.location.href);
    };
    const idle = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof idle === 'function') {
      const id = idle(send, { timeout: 3000 });
      return () =>
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }

    const timer = globalThis.setTimeout(send, 800);
    return () => globalThis.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <CartBootstrap />
      <LiveRegion />
      <SkipToContent />
      <OfflineBanner />
      <AnnouncementBar />
      <StorefrontHeader />
      <main id="main-content" className="safe-pb flex-1 focus:outline-none md:pb-0" tabIndex={-1}>
        <Outlet />
      </main>
      <StorefrontFooter />
      <FloatingSearch />
      <MobileBottomNav />
    </div>
  );
}
