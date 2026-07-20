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
    void trackingApi.pageView(window.location.href);
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
