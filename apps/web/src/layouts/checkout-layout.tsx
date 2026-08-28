import { Outlet, useRouterState } from '@tanstack/react-router';
import { CheckoutStepIndicator } from '@/components/checkout/checkout-step-indicator';
import { PaymentRedirectOverlay } from '@/components/checkout/payment-redirect-overlay';
import { ForceLightTheme } from '@/components/common/force-light-theme';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { FloatingSocialBar } from '@/components/storefront/floating-social-bar';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
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
  const isTerminal =
    pathname.startsWith(ROUTES.checkoutSuccess) || pathname.startsWith(ROUTES.checkoutCancel);

  return (
    <AnalyticsProvider>
      <FlashSaleProvider>
        <div className="bg-background flex min-h-screen flex-col">
          <ForceLightTheme />
          <StorefrontHeader />
          {/* Extra top padding so sticky header never clips the CHECKOUT title */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-10 sm:px-6 sm:pt-12 lg:px-10 lg:pt-14 xl:max-w-none xl:px-14 2xl:px-20">
            {!isTerminal && stepId ? (
              <>
                <div className="mb-8 space-y-2">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                    Secure checkout
                  </p>
                  <h1 className="font-display scroll-mt-28 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Checkout
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Step {CHECKOUT_STEPS.findIndex((step) => step.id === stepId) + 1} of{' '}
                    {CHECKOUT_STEPS.length}
                  </p>
                </div>
                <CheckoutStepIndicator currentStep={stepId} />
              </>
            ) : null}

            <div className="mt-8">
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
