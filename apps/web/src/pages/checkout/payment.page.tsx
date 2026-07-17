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
    if (!paymentMethod) {
      setPaymentMethod('payhere');
    }
  }, [paymentMethod, setPaymentMethod]);

  const handleContinue = () => {
    if (!session?.checkoutToken || !paymentMethod) return;
    refreshCheckout.mutate(
      {
        checkoutRef: session.checkoutToken,
        payload: { extendReservation: true },
      },
      {
        onSuccess: () => {
          void navigate({ to: ROUTES.checkoutReview });
        },
      },
    );
  };

  const handleExtend = () => {
    if (!session?.checkoutToken) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: { extendReservation: true },
    });
  };

  if (sessionQuery.isLoading) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <Skeleton className="h-64 w-full" aria-busy="true" />
      </>
    );
  }

  if (sessionQuery.error) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <AuthErrorAlert error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />
      </>
    );
  }

  if (!session) return null;

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
              backTo={ROUTES.checkoutShipping}
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
