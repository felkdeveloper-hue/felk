import { Outlet } from '@tanstack/react-router';
import { OfflineBanner } from '@/components/feedback/offline-banner';
import { AnnouncementBar } from '@/components/storefront/announcement-bar';
import { FloatingSocialBar } from '@/components/storefront/floating-social-bar';
import { FlashSalePopup } from '@/components/storefront/flash-sale-popup';
import { ForceLightTheme } from '@/components/common/force-light-theme';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { SkipToContent } from '@/components/navigation/skip-to-content';
import { CartBootstrap } from '@/components/cart';
import { LiveRegion } from '@/components/commerce/live-region';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { ReviewRequestPrompt } from '@/components/reviews/review-request-prompt';
import { FlashSaleProvider } from '@/contexts/flash-sale-context';

/** Shell for all public, unauthenticated storefront pages. */
export function PublicLayout() {
  return (
    <AnalyticsProvider>
      <FlashSaleProvider>
        <div className="bg-background text-foreground flex min-h-screen flex-col overflow-x-clip">
          <ForceLightTheme />
          <CartBootstrap />
          <LiveRegion />
          <SkipToContent />
          <OfflineBanner />
          <AnnouncementBar />
          <StorefrontHeader />
          <main
            id="main-content"
            className="safe-mobile-chrome flex-1 scroll-pt-20 focus:outline-none lg:scroll-pt-28 lg:pb-0"
            tabIndex={-1}
          >
            <Outlet />
          </main>
          <StorefrontFooter />
          <MobileBottomNav />
          <FloatingSearch />
          <FloatingSocialBar />
          <ReviewRequestPrompt />
          {/* Flash sale popup — shown once per session after login/signup */}
          <FlashSalePopup />
        </div>
      </FlashSaleProvider>
    </AnalyticsProvider>
  );
}
