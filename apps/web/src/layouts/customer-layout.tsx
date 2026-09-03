import { Navigate, Outlet } from '@tanstack/react-router';
import { ForceLightTheme } from '@/components/common/force-light-theme';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { AccountNav } from '@/components/account';
import { FloatingSocialBar } from '@/components/storefront/floating-social-bar';
import { MobileFloatingFlashSaleCountdown } from '@/components/storefront/mobile-floating-flash-sale-countdown';
import { ReviewRequestPrompt } from '@/components/reviews/review-request-prompt';
import { FlashSaleProvider } from '@/contexts/flash-sale-context';
import { ADMIN_ROUTES } from '@/constants';
import { useAuthStore } from '@/store';
import { isStaffUser } from '@/utils/auth-redirect';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';

/** Shell for authenticated account/orders pages. */
export function CustomerLayout() {
  const user = useAuthStore((state) => state.user);

  if (isStaffUser(user)) {
    return <Navigate to={ADMIN_ROUTES.dashboard} />;
  }

  return (
    <AnalyticsProvider>
      <FlashSaleProvider>
        <div className="bg-background flex min-h-screen flex-col">
          <ForceLightTheme />
          <StorefrontHeader />
          <MobileFloatingFlashSaleCountdown />
          <div className="safe-mobile-chrome mx-auto flex w-full max-w-none flex-1 flex-col gap-8 px-4 pb-8 pt-10 sm:px-6 sm:pt-12 md:px-8 lg:flex-row lg:gap-10 lg:px-10 lg:pb-10 lg:pt-14 xl:px-14 2xl:px-20">
            <aside className="lg:w-56 lg:shrink-0">
              <div className="border-border bg-card sticky top-28 rounded-xl border p-3 sm:p-4">
                <AccountNav />
              </div>
            </aside>
            <main className="min-w-0 flex-1">
              <Outlet />
            </main>
          </div>
          <StorefrontFooter />
          <MobileBottomNav />
          <FloatingSearch />
          <FloatingSocialBar />
          <ReviewRequestPrompt />
        </div>
      </FlashSaleProvider>
    </AnalyticsProvider>
  );
}
