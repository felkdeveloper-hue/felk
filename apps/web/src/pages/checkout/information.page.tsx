import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { WifiOff } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import {
  AddressPicker,
  CheckoutExpiryBanner,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
} from '@/components/checkout';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useAddressesQuery } from '@/hooks/account';
import { useValidateCartMutation } from '@/hooks/cart/use-cart-queries';
import {
  useCheckoutSessionQuery,
  useRefreshCheckoutMutation,
  useStartCheckoutMutation,
} from '@/hooks/checkout';
import { useCheckoutStore } from '@/store';

export function CheckoutInformationPage() {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const billingSameAsShipping = useCheckoutStore((state) => state.billingSameAsShipping);
  const shippingAddressId = useCheckoutStore((state) => state.selectedShippingAddressId);
  const billingAddressId = useCheckoutStore((state) => state.selectedBillingAddressId);
  const setBillingSameAsShipping = useCheckoutStore((state) => state.setBillingSameAsShipping);
  const setShippingAddressId = useCheckoutStore((state) => state.setSelectedShippingAddressId);
  const setBillingAddressId = useCheckoutStore((state) => state.setSelectedBillingAddressId);

  const validateCart = useValidateCartMutation();
  const startCheckout = useStartCheckoutMutation();
  const refreshCheckout = useRefreshCheckoutMutation();
  const { data: addresses } = useAddressesQuery();
  const sessionQuery = useCheckoutSessionQuery();
  const session = sessionQuery.data;

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const cart = await validateCart.mutateAsync();
        if (!cart.items.length) {
          void navigate({ to: ROUTES.cart });
          return;
        }

        if (!useCheckoutStore.getState().checkoutToken) {
          const latestAddresses = addresses;
          const defaultShipping = latestAddresses?.find((address) => address.isDefaultShipping);
          await startCheckout.mutateAsync({
            shippingAddressId: defaultShipping?.id,
            autoReserve: true,
          });
        }
      } catch {
        /* surfaced via mutation state */
      }
    })();
  }, [addresses, navigate, startCheckout, validateCart]);

  useEffect(() => {
    if (!addresses?.length) return;
    const hasValidSelection =
      Boolean(shippingAddressId) && addresses.some((address) => address.id === shippingAddressId);
    if (hasValidSelection) return;
    const defaultShipping = addresses.find((address) => address.isDefaultShipping) ?? addresses[0];
    if (defaultShipping?.id) setShippingAddressId(defaultShipping.id);
  }, [addresses, shippingAddressId, setShippingAddressId]);

  useEffect(() => {
    if (!billingSameAsShipping || !shippingAddressId) return;
    setBillingAddressId(shippingAddressId);
  }, [billingSameAsShipping, shippingAddressId, setBillingAddressId]);

  // Session already loaded (e.g. resumed token) — show the form even if validate/start is still running.
  const bootstrapPending =
    !session && (validateCart.isPending || startCheckout.isPending || sessionQuery.isLoading);
  const bootstrapError = validateCart.error ?? startCheckout.error ?? sessionQuery.error;

  const handleContinue = () => {
    if (!session?.checkoutToken || !shippingAddressId) return;
    const billingId = billingSameAsShipping ? shippingAddressId : billingAddressId;
    if (!billingId) return;

    refreshCheckout.mutate(
      {
        checkoutRef: session.checkoutToken,
        payload: {
          shippingAddressId,
          billingAddressId: billingId,
          extendReservation: true,
        },
      },
      {
        onSuccess: () => {
          void navigate({ to: ROUTES.checkoutShipping });
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

  const handleRestart = () => {
    useCheckoutStore.getState().resetCheckoutUi();
    startedRef.current = false;
    void navigate({ to: ROUTES.checkout, replace: true });
    window.location.reload();
  };

  return (
    <>
      <Seo title="Checkout" description="Enter shipping and billing details." noIndex />

      {offline ? (
        <Alert variant="destructive" className="mb-6" role="alert">
          <WifiOff aria-hidden />
          <AlertTitle>You appear to be offline</AlertTitle>
          <AlertDescription>
            Reconnect to continue checkout. Your progress is saved locally.
          </AlertDescription>
        </Alert>
      ) : null}

      {bootstrapError ? (
        <AuthErrorAlert
          error={bootstrapError}
          onRetry={() => {
            startedRef.current = false;
            void navigate({ to: ROUTES.checkout, replace: true });
            window.location.reload();
          }}
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="checkout-information-heading">
          <h2 id="checkout-information-heading" className="text-lg font-semibold">
            Customer information
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose shipping and billing addresses from your saved profile.
          </p>

          {bootstrapPending ? (
            <div className="mt-6 space-y-4" aria-busy="true">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : session ? (
            <div className="mt-6 space-y-8">
              <CheckoutExpiryBanner
                session={session}
                onExtend={handleExtend}
                onRestart={handleRestart}
                isExtending={refreshCheckout.isPending}
              />
              <CheckoutValidationAlert issues={session.validationIssues} />

              <AddressPicker
                label="Shipping address"
                selectedId={shippingAddressId}
                onSelect={setShippingAddressId}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="billing-same-as-shipping"
                  checked={billingSameAsShipping}
                  onCheckedChange={(checked) => setBillingSameAsShipping(checked === true)}
                />
                <Label htmlFor="billing-same-as-shipping">Billing address same as shipping</Label>
              </div>

              {!billingSameAsShipping ? (
                <AddressPicker
                  label="Billing address"
                  selectedId={billingAddressId}
                  onSelect={setBillingAddressId}
                />
              ) : null}

              <CheckoutNavigation
                showBack={false}
                onNext={handleContinue}
                nextLabel="Continue to shipping"
                nextDisabled={
                  !shippingAddressId ||
                  (!billingSameAsShipping && !billingAddressId) ||
                  !addresses?.some((address) => address.id === shippingAddressId)
                }
                isSubmitting={refreshCheckout.isPending}
              />
            </div>
          ) : !bootstrapError ? (
            <div className="border-border mt-6 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">Unable to start checkout</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Return to your cart and try again.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => void navigate({ to: ROUTES.cart })}
              >
                Back to cart
              </Button>
            </div>
          ) : null}
        </section>

        {session ? (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <CheckoutOrderSummary session={session} />
          </div>
        ) : null}
      </div>
    </>
  );
}
