import { useEffect, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import {
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
  PaymentMethodSelector,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import {
  defaultCheckoutPaymentMethod,
  isCheckoutPaymentEnabled,
} from '@/constants/checkout.constants';
import { useCheckoutSessionQuery, useRefreshCheckoutMutation } from '@/hooks/checkout';
import { useIsMobile } from '@/hooks';
import { usePlaceOrderMutation } from '@/hooks/payment';
import { setCheckoutPlacedFlag } from '@/utils/checkout-placed-flag';
import { AppError } from '@/lib/errors';
import { useCheckoutStore } from '@/store';
import { trackCommerceEvent } from '@/lib/analytics';

/**
 * Desktop: choose payment → continue to review.
 * Mobile: choose payment → place order & pay immediately (no step 3).
 */
export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setSelectedPaymentMethod);
  const shippingAddressId = useCheckoutStore((state) => state.selectedShippingAddressId);
  const billingAddressId = useCheckoutStore((state) => state.selectedBillingAddressId);
  const billingSameAsShipping = useCheckoutStore((state) => state.billingSameAsShipping);

  const sessionQuery = useCheckoutSessionQuery();
  const refreshCheckout = useRefreshCheckoutMutation();
  const placeOrder = usePlaceOrderMutation();
  const session = sessionQuery.data;
  const addressHealAttempted = useRef(false);

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

  // Keep flash-sale totals in sync before PayHere / Mintpay / Koko.
  useEffect(() => {
    if (!session?.checkoutToken || refreshCheckout.isPending) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.checkoutToken]);

  useEffect(() => {
    if (!isCheckoutPaymentEnabled(paymentMethod)) {
      setPaymentMethod(defaultCheckoutPaymentMethod());
    }
  }, [paymentMethod, setPaymentMethod]);

  // Heal missing shipping snapshot before mobile place-order (same as review step).
  useEffect(() => {
    if (!isMobile) return;
    if (!session?.checkoutToken || session.shippingAddress || addressHealAttempted.current) return;
    if (!shippingAddressId || refreshCheckout.isPending) return;
    addressHealAttempted.current = true;
    const billingId = billingSameAsShipping
      ? shippingAddressId
      : (billingAddressId ?? shippingAddressId);
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: {
        shippingAddressId,
        billingAddressId: billingId ?? undefined,
      },
    });
  }, [
    isMobile,
    session?.checkoutToken,
    session?.shippingAddress,
    shippingAddressId,
    billingAddressId,
    billingSameAsShipping,
    refreshCheckout,
  ]);

  const handleContinueDesktop = () => {
    if (!session?.checkoutToken || !paymentMethod) return;
    void navigate({ to: ROUTES.checkoutReview });
  };

  const handlePlaceOrderMobile = () => {
    if (!session?.checkoutToken || !paymentMethod) return;
    if (!isCheckoutPaymentEnabled(paymentMethod)) return;

    placeOrder.mutate(
      { checkoutToken: session.checkoutToken, method: paymentMethod },
      {
        onSuccess: (payment) => {
          setCheckoutPlacedFlag(session.checkoutToken);
          if (payment.redirectForm) {
            const form = document.createElement('form');
            form.method = payment.redirectForm.method;
            form.action = payment.redirectForm.action;
            form.style.display = 'none';
            for (const [name, value] of Object.entries(payment.redirectForm.fields)) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              input.value = value;
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
            return;
          }
          if (payment.redirectUrl) {
            window.location.assign(payment.redirectUrl);
            return;
          }
          void navigate({
            to: ROUTES.checkoutSuccess,
            search: { checkoutToken: session.checkoutToken },
          });
        },
      },
    );
  };

  const handleExtend = () => {
    if (!session?.checkoutToken || !session.reservationIds?.length) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: { extendReservation: true },
    });
  };

  const hardIssues = (session?.validationIssues ?? []).filter(
    (issue) =>
      issue.severity !== 'warning' &&
      issue.code !== 'OUT_OF_STOCK' &&
      issue.code !== 'INSUFFICIENT_STOCK',
  );
  const isClosed = ['completed', 'cancelled', 'expired'].includes(String(session?.status ?? ''));
  const hasShipTo = Boolean(session?.shippingAddress?.line1 || shippingAddressId);
  const hasLines = Boolean(session?.lines?.length);
  const isCheckoutReady = hasShipTo && hasLines && !isClosed;
  const canPlaceOrder = Boolean(paymentMethod && isCheckoutReady) && hardIssues.length === 0;
  const isHealingAddress =
    isMobile &&
    Boolean(session && !session.shippingAddress && shippingAddressId) &&
    (refreshCheckout.isPending || !addressHealAttempted.current);
  const placeOrderError = placeOrder.error;

  if (sessionQuery.error) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <AuthErrorAlert error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8" aria-busy="true">
          <div className="min-w-0 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="hidden h-64 w-full sm:block" />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Payment" description="Choose a payment method." noIndex />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <section aria-labelledby="checkout-payment-heading" className="min-w-0">
          <h2 id="checkout-payment-heading" className="text-base font-semibold sm:text-lg">
            Payment method
          </h2>
          <p className="text-muted-foreground mt-1 hidden text-xs sm:mt-1 sm:block sm:text-sm">
            You will complete payment on the review step.
          </p>
          <p className="text-muted-foreground mt-1 text-xs sm:hidden">
            Choose a payment option to continue securely.
          </p>

          <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
            <div className="hidden sm:block">
              <CheckoutExpiryBanner
                session={session}
                onExtend={handleExtend}
                isExtending={refreshCheckout.isPending}
              />
            </div>
            <div className="hidden sm:block">
              <CheckoutValidationAlert issues={session.validationIssues} />
            </div>

            {isMobile && hardIssues.length > 0 ? (
              <CheckoutValidationAlert issues={hardIssues} />
            ) : null}

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              compact={isMobile}
            />

            {isMobile && placeOrderError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {AppError.isAppError(placeOrderError)
                    ? placeOrderError.message
                    : 'Unable to start payment. Please try again.'}
                </AlertDescription>
              </Alert>
            ) : null}

            {isMobile && !isCheckoutReady && !isHealingAddress ? (
              <Alert role="status">
                <AlertDescription>
                  {hasLines && !hasShipTo
                    ? 'Add a shipping address before placing your order.'
                    : 'Checkout is not ready yet. Go back and refresh your details.'}{' '}
                  <Link to={ROUTES.checkout} className="underline underline-offset-2">
                    Back to information
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}

            {isMobile ? (
              <CheckoutNavigation
                backTo={ROUTES.checkout}
                backLabel="Back"
                onNext={handlePlaceOrderMobile}
                nextLabel="Place order & pay"
                nextDisabled={!canPlaceOrder || isHealingAddress || !paymentMethod}
                isSubmitting={placeOrder.isPending || isHealingAddress}
              />
            ) : (
              <CheckoutNavigation
                backTo={ROUTES.checkout}
                onNext={handleContinueDesktop}
                nextLabel="Review order"
                nextDisabled={!paymentMethod}
              />
            )}
          </div>
        </section>

        {/* Order summary — desktop only; mobile step 2 is payment-only */}
        <div className="hidden min-w-0 sm:block lg:sticky lg:top-24 lg:self-start">
          <CheckoutOrderSummary session={session} />
        </div>
      </div>
    </>
  );
}
