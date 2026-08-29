import { Outlet, useRouterState } from '@tanstack/react-router';
import { CheckoutStepIndicator } from '@/components/checkout/checkout-step-indicator';
import { PaymentRedirectOverlay } from '@/components/checkout/payment-redirect-overlay';
import { ForceLightTheme } from '@/components/common/force-light-theme';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { FloatingSocialBar } from '@/components/storefront/floating-social-bar';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
import { useIsMobile } from '@/hooks';
import { useCheckoutStore } from '@/store';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { FlashSaleProvider } from '@/contexts/flash-sale-context';

function resolveStepId(pathname: string): CheckoutStepId | null {
  if (pathname === ROUTES.checkout || pathname === `${ROUTES.checkout}/`) return 'information';
  // Legacy shipping URL redirects to payment — treat as payment step if still hit.
  if (pathname.startsWith(ROUTES.checkoutShipping)) return 'payment';
  if (pathname.startsWith(ROUTES.checkoutPayment)) return 'payment';
  if (pathname.startsWith(ROUTES.checkoutReview)) return 'review';
  return null;
}

export function CheckoutLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const stepId = resolveStepId(pathname);
  const isRedirecting = useCheckoutStore((state) => state.isRedirectingToGateway);
  const isMobile = useIsMobile(640);
  const isTerminal =
    pathname.startsWith(ROUTES.checkoutSuccess) || pathname.startsWith(ROUTES.checkoutCancel);

  const mobileSteps = CHECKOUT_STEPS.filter((step) => step.id !== 'review');
  const visibleSteps = isMobile ? mobileSteps : CHECKOUT_STEPS;
  const resolvedStepId: CheckoutStepId | null =
    isMobile && stepId === 'review' ? 'payment' : stepId;
  const stepNumber =
    resolvedStepId != null ? visibleSteps.findIndex((step) => step.id === resolvedStepId) + 1 : 0;

  return (
    <AnalyticsProvider>
      <FlashSaleProvider>
        <div className="bg-background flex min-h-screen flex-col overflow-x-clip">
          <ForceLightTheme />
          <StorefrontHeader />
          {/* Compact mobile chrome; desktop keeps larger title spacing */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-12 lg:px-10 lg:pt-14 xl:max-w-none xl:px-14 2xl:px-20">
            {!isTerminal && stepId ? (
              <>
                <div className="mb-4 space-y-1 sm:mb-8 sm:space-y-2">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]">
                    Secure checkout
                  </p>
                  <h1 className="font-display scroll-mt-24 text-2xl font-bold uppercase tracking-tight sm:scroll-mt-28 sm:text-4xl">
                    Checkout
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Step {Math.max(1, stepNumber)} of {visibleSteps.length}
                  </p>
                </div>
                <CheckoutStepIndicator currentStep={stepId} />
              </>
            ) : null}

            <div className="mt-4 min-w-0 sm:mt-8">
              <Outlet />
            </div>
          </main>
          <StorefrontFooter />
          <FloatingSearch />
          <FloatingSocialBar />
          <PaymentRedirectOverlay open={isRedirecting} />
        </div>
      </FlashSaleProvider>
    </AnalyticsProvider>
  );
}
