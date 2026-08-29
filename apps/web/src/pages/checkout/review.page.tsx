import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { BadgeCheck, CreditCard, Lock, MapPin, Pencil, ShieldCheck, Truck } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import {
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PAYMENT_METHOD_OPTIONS,
  SHIPPING_METHOD_OPTIONS,
  isCheckoutPaymentEnabled,
} from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
import { useCheckoutSessionQuery, useRefreshCheckoutMutation } from '@/hooks/checkout';
import { useIsMobile } from '@/hooks';
import { usePlaceOrderMutation } from '@/hooks/payment';
import { setCheckoutPlacedFlag } from '@/utils/checkout-placed-flag';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useCheckoutStore } from '@/store';
import { trackCommerceEvent } from '@/lib/analytics';
import { formatCurrency } from '@/utils/format';
import type { PaymentMethod, ShippingMethod } from '@/services/sdk';

const COUNTRY_LABELS: Record<string, string> = {
  LK: 'Sri Lanka',
  IN: 'India',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  MY: 'Malaysia',
  GB: 'United Kingdom',
  US: 'United States',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
};

function countryLabel(code: string) {
  return COUNTRY_LABELS[code.toUpperCase()] ?? code;
}

function shippingLabel(method: ShippingMethod | string) {
  return (
    SHIPPING_METHOD_OPTIONS.find((option) => option.id === method)?.label ??
    String(method).replace(/_/g, ' ')
  );
}

function shippingDescription(method: ShippingMethod | string) {
  return SHIPPING_METHOD_OPTIONS.find((option) => option.id === method)?.description;
}

function paymentOption(method: PaymentMethod | null) {
  if (!method) return null;
  return PAYMENT_METHOD_OPTIONS.find((option) => option.id === method) ?? null;
}

function ReviewSection({
  icon: Icon,
  title,
  editTo,
  editLabel,
  children,
  className,
}: {
  icon: typeof MapPin;
  title: string;
  editTo?: string;
  editLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border-border bg-card/60 min-w-0 rounded-xl border p-3.5 sm:rounded-2xl sm:p-5',
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <h3 className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
          <Icon className="size-3 sm:size-3.5" aria-hidden />
          {title}
        </h3>
        {editTo ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="h-7 px-1.5 text-xs sm:h-8 sm:px-2"
          >
            <Link to={editTo}>
              <Pencil className="size-3.5" aria-hidden />
              {editLabel ?? 'Edit'}
            </Link>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function AddressDetails({
  address,
}: {
  address: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
    phone?: string;
  };
}) {
  return (
    <div className="text-sm">
      <p className="font-medium">{address.fullName}</p>
      {address.phone ? <p className="text-muted-foreground mt-0.5">{address.phone}</p> : null}
      <p className="text-muted-foreground mt-2 leading-relaxed">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}
        <br />
        {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
        <br />
        {countryLabel(address.country)}
      </p>
    </div>
  );
}

export function CheckoutReviewPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const shippingAddressId = useCheckoutStore((state) => state.selectedShippingAddressId);
  const billingAddressId = useCheckoutStore((state) => state.selectedBillingAddressId);
  const billingSameAsShipping = useCheckoutStore((state) => state.billingSameAsShipping);

  const sessionQuery = useCheckoutSessionQuery();
  const refreshCheckout = useRefreshCheckoutMutation();
  const placeOrder = usePlaceOrderMutation();
  const session = sessionQuery.data;
  const addressHealAttempted = useRef(false);

  const selectedPayment = paymentOption(paymentMethod);
  const isCod = paymentMethod === 'cod';

  // Mobile skips review — pay from step 2 instead.
  useEffect(() => {
    if (isMobile) {
      void navigate({ to: ROUTES.checkoutPayment, replace: true });
    }
  }, [isMobile, navigate]);

  useEffect(() => {
    if (!checkoutToken && !sessionQuery.isLoading) {
      void navigate({ to: ROUTES.checkout });
    }
  }, [checkoutToken, navigate, sessionQuery.isLoading]);

  useEffect(() => {
    if (paymentMethod && !isCheckoutPaymentEnabled(paymentMethod)) {
      void navigate({ to: ROUTES.checkoutPayment });
    }
  }, [navigate, paymentMethod]);

  useEffect(() => {
    if (checkoutToken) {
      trackCommerceEvent('checkout_review_reached', null, { checkoutToken });
    }
  }, [checkoutToken]);

  // Refresh totals on review so Amount Due includes the active flash sale (matches PayHere).
  useEffect(() => {
    if (!session?.checkoutToken || refreshCheckout.isPending) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: {},
    });
    // Only on first mount / token change — not on every session update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.checkoutToken]);

  // If the session lost its shipping snapshot (common after failed payment / stale
  // checkout), re-attach the address the shopper already picked on Information.
  useEffect(() => {
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
    session?.checkoutToken,
    session?.shippingAddress,
    shippingAddressId,
    billingAddressId,
    billingSameAsShipping,
    refreshCheckout,
  ]);

  const handlePlaceOrder = () => {
    if (!session?.checkoutToken || !paymentMethod) return;
    if (!isCheckoutPaymentEnabled(paymentMethod)) {
      void navigate({ to: ROUTES.checkoutPayment });
      return;
    }

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

  const placeOrderError = placeOrder.error;
  // Soft warnings (price change, etc.) must not block Mintpay. Hard stock errors
  // are re-checked by the payment API at Place Order.
  const softIssues = (session?.validationIssues ?? []).filter(
    (issue) => issue.severity === 'warning',
  );
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
    Boolean(session && !session.shippingAddress && shippingAddressId) &&
    (refreshCheckout.isPending || !addressHealAttempted.current);

  if (isMobile) {
    return (
      <>
        <Seo title="Payment" description="Choose a payment method." noIndex />
        <Skeleton className="h-48 w-full" aria-busy="true" />
      </>
    );
  }

  if (sessionQuery.isLoading && !session) {
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

  if (!session) {
    return (
      <>
        <Seo title="Review" description="Review your order." noIndex />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Review order" description="Review and place your order." noIndex />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <section aria-labelledby="checkout-review-heading" className="min-w-0">
          <h2
            id="checkout-review-heading"
            className="font-display text-xl font-bold tracking-tight sm:text-2xl"
          >
            Almost done
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Check everything below, then place your order. You can edit any section before
            confirming.
          </p>

          <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
            <CheckoutExpiryBanner
              session={session}
              onExtend={handleExtend}
              isExtending={refreshCheckout.isPending}
            />
            <CheckoutValidationAlert issues={[...hardIssues, ...softIssues]} />

            <div className="grid gap-4 sm:grid-cols-2">
              {session.shippingAddress ? (
                <ReviewSection
                  icon={MapPin}
                  title="Ship to"
                  editTo={ROUTES.checkout}
                  editLabel="Change"
                >
                  <AddressDetails address={session.shippingAddress} />
                </ReviewSection>
              ) : null}

              {session.billingAddress ? (
                <ReviewSection
                  icon={CreditCard}
                  title="Bill to"
                  editTo={ROUTES.checkout}
                  editLabel="Change"
                >
                  <AddressDetails address={session.billingAddress} />
                </ReviewSection>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewSection icon={Truck} title="Delivery">
                <p className="font-medium capitalize">{shippingLabel(session.shippingMethod)}</p>
                {shippingDescription(session.shippingMethod) ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {shippingDescription(session.shippingMethod)}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-sm">
                  Shipping:{' '}
                  <span className="text-foreground font-medium">
                    {formatCurrency(session.totals.shipping, session.currency)}
                  </span>
                </p>
              </ReviewSection>

              <ReviewSection
                icon={ShieldCheck}
                title="Payment"
                editTo={ROUTES.checkoutPayment}
                editLabel="Change"
              >
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {selectedPayment ? (
                    <div className="bg-background border-border/70 flex h-10 w-[120px] items-center justify-center rounded-lg border px-2 sm:h-12 sm:w-[148px] sm:rounded-xl">
                      <img
                        src={selectedPayment.logoSrc}
                        alt=""
                        width={140}
                        height={36}
                        className="h-7 w-auto max-w-full object-contain sm:h-9"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {selectedPayment?.label ??
                        paymentMethod?.replace(/_/g, ' ') ??
                        'Not selected'}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {isCod
                        ? 'Pay in cash when your order is delivered.'
                        : (selectedPayment?.description ??
                          'You will complete payment on the next screen.')}
                    </p>
                  </div>
                </div>
              </ReviewSection>
            </div>

            <div className="border-border from-muted/40 to-card rounded-2xl border bg-gradient-to-br p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
                    Amount due
                  </p>
                  <p className="font-display mt-1 text-3xl font-bold tracking-tight">
                    {formatCurrency(session.totals.grandTotal, session.currency)}
                  </p>
                </div>
                <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                  {isCod
                    ? 'No payment is taken online. Have the exact amount ready for delivery.'
                    : 'After you place the order, you will be redirected to a secure payment page.'}
                </p>
              </div>
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

            {!isCheckoutReady && !isHealingAddress ? (
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

            <CheckoutNavigation
              backTo={ROUTES.checkoutPayment}
              backLabel="Back to payment"
              onNext={handlePlaceOrder}
              nextLabel={isCod ? 'Place order' : 'Place order & pay'}
              nextDisabled={!canPlaceOrder || isHealingAddress}
              isSubmitting={placeOrder.isPending || isHealingAddress}
            />

            <ul className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Lock className="size-3.5 text-emerald-600" aria-hidden />
                SSL encrypted
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                Secure checkout
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
                {isCod ? 'Pay on delivery' : 'Trusted payment partners'}
              </li>
            </ul>
          </div>
        </section>

        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <CheckoutOrderSummary session={session} />
        </div>
      </div>
    </>
  );
}
