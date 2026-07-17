import { useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import {
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import {
  useCheckoutSessionQuery,
  useRefreshCheckoutMutation,
  useValidateCheckoutMutation,
} from '@/hooks/checkout';
import { usePlaceOrderMutation } from '@/hooks/payment';
import { useCheckoutStore } from '@/store';
import { AppError } from '@/lib/errors';
import { formatCurrency } from '@/utils/format';

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: {
    fullName: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
}) {
  return (
    <div className="border-border rounded-lg border p-4 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-2">{address.fullName}</p>
      {address.phone ? <p className="text-muted-foreground">{address.phone}</p> : null}
      <p className="text-muted-foreground mt-1">
        {address.line1}, {address.city} {address.postalCode}, {address.country}
      </p>
    </div>
  );
}

export function CheckoutReviewPage() {
  const navigate = useNavigate();
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const terms = useCheckoutStore((state) => state.termsAccepted);
  const setTermsAccepted = useCheckoutStore((state) => state.setTermsAccepted);

  const sessionQuery = useCheckoutSessionQuery();
  const validateCheckout = useValidateCheckoutMutation();
  const refreshCheckout = useRefreshCheckoutMutation();
  const placeOrder = usePlaceOrderMutation();
  const session = sessionQuery.data;

  useEffect(() => {
    if (!checkoutToken && !sessionQuery.isLoading) {
      void navigate({ to: ROUTES.checkout });
    }
  }, [checkoutToken, navigate, sessionQuery.isLoading]);

  useEffect(() => {
    if (session?.checkoutToken) {
      validateCheckout.mutate(session.checkoutToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.checkoutToken]);

  const handlePlaceOrder = () => {
    if (!session?.checkoutToken || !paymentMethod || !terms) return;

    placeOrder.mutate(
      { checkoutToken: session.checkoutToken, method: paymentMethod },
      {
        onSuccess: (payment) => {
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
    if (!session?.checkoutToken) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: { extendReservation: true },
    });
  };

  const placeOrderError = placeOrder.error;
  const validationIssues = validateCheckout.data?.issues ?? session?.validationIssues;
  const hasBlockingIssues = validationIssues?.some((issue) => issue.severity !== 'warning');

  if (sessionQuery.isLoading) {
    return (
      <>
        <Seo title="Review order" description="Review and place your order." noIndex />
        <Skeleton className="h-64 w-full" aria-busy="true" />
      </>
    );
  }

  if (sessionQuery.error) {
    return (
      <>
        <Seo title="Review order" description="Review and place your order." noIndex />
        <AuthErrorAlert error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />
      </>
    );
  }

  if (!session) return null;

  return (
    <>
      <Seo title="Review order" description="Review and place your order." noIndex />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="checkout-review-heading">
          <h2 id="checkout-review-heading" className="text-lg font-semibold">
            Review your order
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Confirm details before placing your order.
          </p>

          <div className="mt-6 space-y-6">
            <CheckoutExpiryBanner
              session={session}
              onExtend={handleExtend}
              isExtending={refreshCheckout.isPending}
            />
            <CheckoutValidationAlert issues={validationIssues} />

            <div className="grid gap-4 sm:grid-cols-2">
              {session.shippingAddress ? (
                <AddressBlock title="Shipping" address={session.shippingAddress} />
              ) : null}
              {session.billingAddress ? (
                <AddressBlock title="Billing" address={session.billingAddress} />
              ) : null}
            </div>

            <div className="border-border rounded-lg border p-4 text-sm">
              <p className="font-medium">Shipping method</p>
              <p className="text-muted-foreground mt-1 capitalize">{session.shippingMethod}</p>
              <p className="mt-3 font-medium">Payment method</p>
              <p className="text-muted-foreground mt-1 capitalize">
                {paymentMethod?.replace('_', ' ')}
              </p>
            </div>

            <div className="border-border rounded-lg border p-4">
              <p className="text-sm font-medium">Order total</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(session.totals.grandTotal, session.currency)}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms-accepted"
                checked={terms}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              <Label htmlFor="terms-accepted" className="text-sm leading-relaxed">
                I agree to the{' '}
                <Link to={ROUTES.terms} className="text-primary underline-offset-4 hover:underline">
                  terms and conditions
                </Link>{' '}
                and{' '}
                <Link
                  to={ROUTES.privacy}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  privacy policy
                </Link>
                .
              </Label>
            </div>

            {placeOrderError ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {AppError.isAppError(placeOrderError)
                    ? placeOrderError.message
                    : 'Unable to start payment. Please try again.'}
                </AlertDescription>
              </Alert>
            ) : null}

            <CheckoutNavigation
              backTo={ROUTES.checkoutPayment}
              onNext={handlePlaceOrder}
              nextLabel="Place order"
              nextDisabled={
                !terms || !paymentMethod || hasBlockingIssues || !session.readyForPayment
              }
              isSubmitting={placeOrder.isPending}
            />

            {!session.readyForPayment ? (
              <p className="text-muted-foreground text-sm" role="status">
                Checkout is not ready for payment. Resolve validation issues or refresh your
                session.
              </p>
            ) : null}
          </div>
        </section>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutOrderSummary session={session} />
        </div>
      </div>
    </>
  );
}
