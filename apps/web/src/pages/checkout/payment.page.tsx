import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import {
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
  PaymentMethodSelector,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useCheckoutSessionQuery, useRefreshCheckoutMutation } from '@/hooks/checkout';
import { useCheckoutStore } from '@/store';
import { trackCommerceEvent } from '@/lib/analytics';

export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setSelectedPaymentMethod);

  const sessionQuery = useCheckoutSessionQuery();
  const refreshCheckout = useRefreshCheckoutMutation();
  const session = sessionQuery.data;

  useEffect(() => {
    if (!checkoutToken && !sessionQuery.isLoading) {
      void navigate({ to: ROUTES.checkout });
    }
  }, [checkoutToken, navigate, sessionQuery.isLoading]);

  useEffect(() => {
    if (checkoutToken) {
      trackCommerceEvent('payment_page_reached', null, { checkoutToken });
    }
  }, [checkoutToken]);

  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod('payhere');
    }
  }, [paymentMethod, setPaymentMethod]);

  const handleContinue = () => {
    if (!session?.checkoutToken || !paymentMethod) return;
    // No inventory hold on this step — reserve happens at Place Order.
    void navigate({ to: ROUTES.checkoutReview });
  };

  const handleExtend = () => {
    if (!session?.checkoutToken || !session.reservationIds?.length) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: { extendReservation: true },
    });
  };

  if (sessionQuery.error) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <AuthErrorAlert error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />
      </>
    );
  }

  // Never render a blank page — isLoading can be false while the query is still pending/disabled.
  if (!session) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Payment" description="Choose a payment method." noIndex />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="checkout-payment-heading">
          <h2 id="checkout-payment-heading" className="text-lg font-semibold">
            Payment method
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            You will complete payment on the review step.
          </p>

          <div className="mt-6 space-y-6">
            <CheckoutExpiryBanner
              session={session}
              onExtend={handleExtend}
              isExtending={refreshCheckout.isPending}
            />
            <CheckoutValidationAlert issues={session.validationIssues} />

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={refreshCheckout.isPending}
            />

            <CheckoutNavigation
              backTo={ROUTES.checkout}
              onNext={handleContinue}
              nextLabel="Review order"
              nextDisabled={!paymentMethod}
              isSubmitting={refreshCheckout.isPending}
            />
          </div>
        </section>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutOrderSummary session={session} />
        </div>
      </div>
    </>
  );
}
