import { Outlet, useRouterState } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckoutStepIndicator } from '@/components/checkout/checkout-step-indicator';
import { PaymentRedirectOverlay } from '@/components/checkout/payment-redirect-overlay';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { CHECKOUT_STEPS, type CheckoutStepId } from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
import { useCheckoutStore } from '@/store';

function resolveStepId(pathname: string): CheckoutStepId | null {
  if (pathname === ROUTES.checkout || pathname === `${ROUTES.checkout}/`) return 'information';
  if (pathname.startsWith(ROUTES.checkoutShipping)) return 'shipping';
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
    <div className="bg-background flex min-h-screen flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10 xl:max-w-none xl:px-14 2xl:px-20">
        {!isTerminal && stepId ? (
          <>
            <div className="mb-8 space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                Secure checkout
              </p>
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
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

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <StorefrontFooter />
      <FloatingSearch />
      <PaymentRedirectOverlay open={isRedirecting} />
    </div>
  );
}
