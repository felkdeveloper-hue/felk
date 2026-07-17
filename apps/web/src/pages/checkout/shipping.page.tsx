import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import {
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
  ShippingMethodSelector,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useCheckoutSessionQuery, useRefreshCheckoutMutation } from '@/hooks/checkout';
import { useCheckoutStore } from '@/store';

export function CheckoutShippingPage() {
  const navigate = useNavigate();
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const shippingMethod = useCheckoutStore((state) => state.selectedShippingMethod);
  const setShippingMethod = useCheckoutStore((state) => state.setSelectedShippingMethod);

  const sessionQuery = useCheckoutSessionQuery();
  const refreshCheckout = useRefreshCheckoutMutation();
  const session = sessionQuery.data;

  useEffect(() => {
    if (!checkoutToken && !sessionQuery.isLoading) {
      void navigate({ to: ROUTES.checkout });
    }
  }, [checkoutToken, navigate, sessionQuery.isLoading]);

  useEffect(() => {
    if (session?.shippingMethod) {
      setShippingMethod(session.shippingMethod);
    }
  }, [session?.shippingMethod, setShippingMethod]);

  const handleContinue = () => {
    if (!session?.checkoutToken) return;
    refreshCheckout.mutate(
      {
        checkoutRef: session.checkoutToken,
        payload: {
          shippingMethod,
          deliveryMethod: shippingMethod === 'pickup' ? 'pickup' : 'delivery',
          extendReservation: true,
        },
      },
      {
        onSuccess: () => {
          void navigate({ to: ROUTES.checkoutPayment });
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
        <Seo title="Shipping" description="Choose a shipping method." noIndex />
        <Skeleton className="h-64 w-full" aria-busy="true" />
      </>
    );
  }

  if (sessionQuery.error) {
    return (
      <>
        <Seo title="Shipping" description="Choose a shipping method." noIndex />
        <AuthErrorAlert error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />
      </>
    );
  }

  if (!session) return null;

  return (
    <>
      <Seo title="Shipping" description="Choose a shipping method." noIndex />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="checkout-shipping-heading">
          <h2 id="checkout-shipping-heading" className="text-lg font-semibold">
            Shipping method
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Select how you would like to receive your order.
          </p>

          <div className="mt-6 space-y-6">
            <CheckoutExpiryBanner
              session={session}
              onExtend={handleExtend}
              isExtending={refreshCheckout.isPending}
            />
            <CheckoutValidationAlert issues={session.validationIssues} />

            <ShippingMethodSelector
              session={session}
              value={shippingMethod}
              onChange={setShippingMethod}
              disabled={refreshCheckout.isPending}
            />

            <CheckoutNavigation
              backTo={ROUTES.checkout}
              onNext={handleContinue}
              nextLabel="Continue to payment"
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
