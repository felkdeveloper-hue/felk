import { useEffect } from 'react';
import { Outlet, useLocation, useRouterState } from '@tanstack/react-router';
import { CheckoutStepIndicator } from '@/components/checkout/checkout-step-indicator';
import { PaymentRedirectOverlay } from '@/components/checkout/payment-redirect-overlay';
import { ForceLightTheme } from '@/components/common/force-light-theme';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
import { useCheckoutStore } from '@/store';
import { trackingApi } from '@/services/sdk/tracking';

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
  const location = useLocation();
  const stepId = resolveStepId(pathname);
  const isRedirecting = useCheckoutStore((state) => state.isRedirectingToGateway);
  const isTerminal =
    pathname.startsWith(ROUTES.checkoutSuccess) || pathname.startsWith(ROUTES.checkoutCancel);

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

        <div key={pathname} className="mt-8">
          <Outlet />
        </div>
      </main>
      <StorefrontFooter />
      <FloatingSearch />
      <PaymentRedirectOverlay open={isRedirecting} />
    </div>
  );
}
