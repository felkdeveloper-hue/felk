import { useEffect, type ReactNode } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PAYMENT_METHOD_OPTIONS, SHIPPING_METHOD_OPTIONS } from '@/constants/checkout.constants';
import { ROUTES } from '@/constants';
import {
  useCheckoutSessionQuery,
  useRefreshCheckoutMutation,
  useValidateCheckoutMutation,
} from '@/hooks/checkout';
import { usePlaceOrderMutation } from '@/hooks/payment';
import { setCheckoutPlacedFlag } from '@/utils/checkout-placed-flag';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useCheckoutStore } from '@/store';
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
    <section className={cn('border-border bg-card/60 rounded-2xl border p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-full">
            <Icon className="size-4" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        </div>
        {editTo ? (
          <Button type="button" variant="ghost" size="sm" asChild className="h-8 px-2">
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
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const terms = useCheckoutStore((state) => state.termsAccepted);
  const setTermsAccepted = useCheckoutStore((state) => state.setTermsAccepted);

  const sessionQuery = useCheckoutSessionQuery();
  const validateCheckout = useValidateCheckoutMutation();
  const refreshCheckout = useRefreshCheckoutMutation();
  const placeOrder = usePlaceOrderMutation();
  const session = sessionQuery.data;

  const selectedPayment = paymentOption(paymentMethod);
  const isCod = paymentMethod === 'cod';

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
    if (!session?.checkoutToken) return;
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: { extendReservation: true },
    });
  };

  const placeOrderError = placeOrder.error;
  const validationIssues = validateCheckout.data?.issues ?? session?.validationIssues;
  const hasBlockingIssues = validationIssues?.some((issue) => issue.severity !== 'warning');
  const canPlaceOrder =
    Boolean(terms && paymentMethod && session?.readyForPayment) && !hasBlockingIssues;

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
          <h2
            id="checkout-review-heading"
            className="font-display text-2xl font-bold tracking-tight"
          >
            Almost done
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Check everything below, then place your order. You can edit any section before
            confirming.
          </p>

          <div className="mt-6 space-y-4">
            <CheckoutExpiryBanner
              session={session}
              onExtend={handleExtend}
              isExtending={refreshCheckout.isPending}
            />
            <CheckoutValidationAlert issues={validationIssues} />

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

            <ReviewSection
              icon={Truck}
              title="Delivery"
              editTo={ROUTES.checkoutShipping}
              editLabel="Change"
            >
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
              <div className="flex flex-wrap items-center gap-4">
                {selectedPayment ? (
                  <div className="bg-background border-border/70 flex h-12 w-[148px] items-center justify-center rounded-xl border px-2">
                    <img
                      src={selectedPayment.logoSrc}
                      alt=""
                      width={140}
                      height={36}
                      className="h-9 w-auto max-w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium">
                    {selectedPayment?.label ?? paymentMethod?.replace(/_/g, ' ') ?? 'Not selected'}
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

            <div className="border-border rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms-accepted"
                  checked={terms}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms-accepted" className="text-sm font-normal leading-relaxed">
                  I agree to the{' '}
                  <Link
                    to={ROUTES.terms}
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    terms and conditions
                  </Link>{' '}
                  and{' '}
                  <Link
                    to={ROUTES.privacy}
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    privacy policy
                  </Link>
                  .
                </Label>
              </div>
              {!terms ? (
                <p className="text-muted-foreground mt-3 pl-7 text-xs">
                  Accept the terms to enable Place order.
                </p>
              ) : null}
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

            {!session.readyForPayment ? (
              <Alert role="status">
                <AlertDescription>
                  Checkout is not ready yet. Fix any issues above, or go back and refresh your
                  details.
                </AlertDescription>
              </Alert>
            ) : null}

            <CheckoutNavigation
              backTo={ROUTES.checkoutPayment}
              backLabel="Back to payment"
              onNext={handlePlaceOrder}
              nextLabel={isCod ? 'Place order' : 'Place order & pay'}
              nextDisabled={!canPlaceOrder}
              isSubmitting={placeOrder.isPending}
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

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutOrderSummary session={session} />
        </div>
      </div>
    </>
  );
}
