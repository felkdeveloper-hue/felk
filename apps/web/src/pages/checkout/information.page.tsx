import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { WifiOff } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import {
  AddressPicker,
  CheckoutExpiryBanner,
  CheckoutGuestAuthDialog,
  CheckoutNavigation,
  CheckoutOrderSummary,
  CheckoutValidationAlert,
} from '@/components/checkout';
import { CartItemRow, CartOrderSummary } from '@/components/cart';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import { useAddressesQuery } from '@/hooks/account';
import {
  isCheckoutClosedError,
  useCheckoutSessionQuery,
  useRefreshCheckoutMutation,
  useStartCheckoutMutation,
} from '@/hooks/checkout';
import { useAuthStore, useCartStore, useCheckoutStore } from '@/store';
import { trackCommerceEvent } from '@/lib/analytics';
import { buildMetaProductFromLines, checkoutEventId, trackingApi } from '@/services/sdk/tracking';
import { isGuestCheckoutUser } from '@/utils/auth/guest-checkout';
import { AppError } from '@/lib/errors';
import { QUERY_KEYS } from '@/constants';
import { cartApi, type CustomerAddress } from '@/services/sdk';
import { useQueryClient } from '@tanstack/react-query';

export function CheckoutInformationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);
  const recoveringClosedRef = useRef(false);
  const [recoveringClosed, setRecoveringClosed] = useState(false);
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  // Stay on the guest bridge (dialog + bag preview) until merge/address finish —
  // setSession alone must not start checkout or unmount the dialog mid-flow.
  const [guestBridgeOpen, setGuestBridgeOpen] = useState(false);

  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const authUser = useAuthStore((state) => state.user);
  const isAuthed = Boolean(accessToken);
  const isGuestCheckout = isGuestCheckoutUser(authUser);
  const guestCart = useCartStore((state) => state.cart);

  const billingSameAsShipping = useCheckoutStore((state) => state.billingSameAsShipping);
  const shippingAddressId = useCheckoutStore((state) => state.selectedShippingAddressId);
  const billingAddressId = useCheckoutStore((state) => state.selectedBillingAddressId);
  const checkoutToken = useCheckoutStore((state) => state.checkoutToken);
  const isPrimingCheckout = useCheckoutStore((state) => state.isPrimingCheckout);
  const setBillingSameAsShipping = useCheckoutStore((state) => state.setBillingSameAsShipping);
  const setShippingAddressId = useCheckoutStore((state) => state.setSelectedShippingAddressId);
  const setBillingAddressId = useCheckoutStore((state) => state.setSelectedBillingAddressId);

  const startCheckout = useStartCheckoutMutation();
  const refreshCheckout = useRefreshCheckoutMutation();
  const sessionQuery = useCheckoutSessionQuery();
  // Prefer live mutation result so Continue unlocks as soon as /checkout/start returns.
  const session = sessionQuery.data ?? startCheckout.data;
  const addressesQuery = useAddressesQuery(isAuthed);
  const { data: addresses } = addressesQuery;

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

  const beginCheckout = async () => {
    // Cart already fired /checkout/start while navigating — wait for that result.
    if (useCheckoutStore.getState().isPrimingCheckout) return;

    // If cart already primed checkout while navigating, reuse that session.
    const existingToken = useCheckoutStore.getState().checkoutToken;
    if (existingToken) {
      const cached = queryClient.getQueryData(QUERY_KEYS.checkout.detail(existingToken));
      if (cached) return;
    }
    if (startCheckout.isPending || startCheckout.isSuccess) return;

    let storeCart = useCartStore.getState().cart;
    const guestCartToken = useCartStore.getState().guestCartToken;

    // Prefer merging guest bag in the background of the UI — never block the modal on this.
    if (guestCartToken) {
      try {
        const merged = await cartApi.merge(guestCartToken);
        useCartStore.getState().setCart(merged);
        useCartStore.getState().setGuestCartToken(null);
        queryClient.setQueryData(QUERY_KEYS.cart.current(), merged);
        storeCart = merged;
      } catch {
        /* keep local snapshot; start with explicit line items below */
      }
    }

    // Skip an extra cart round-trip when the store already has line items.
    if (!storeCart?.items?.length) {
      try {
        const fresh = await cartApi.get();
        useCartStore.getState().setCart(fresh);
        queryClient.setQueryData(QUERY_KEYS.cart.current(), fresh);
        storeCart = fresh;
      } catch {
        /* use local snapshot */
      }
    }

    if (!storeCart?.items?.length) {
      void navigate({ to: ROUTES.cart });
      return;
    }

    const hasUnavailable =
      storeCart.validation?.isValid === false ||
      storeCart.items.some(
        (item) =>
          item.inStock === false ||
          item.stockStatus === 'out_of_stock' ||
          (typeof item.availableQuantity === 'number' && item.availableQuantity < item.quantity),
      );
    if (hasUnavailable) {
      void navigate({ to: ROUTES.cart });
      return;
    }

    const cachedAddresses =
      addresses ?? queryClient.getQueryData<CustomerAddress[]>(QUERY_KEYS.customers.addresses());
    const defaultShipping = cachedAddresses?.find((address) => address.isDefaultShipping);
    const buyNowItems = useCheckoutStore.getState().buyNowItems;
    const cartLineItems = storeCart.items
      .filter((item) => Boolean(item.variantId))
      .map((item) => ({
        variantId: String(item.variantId),
        quantity: item.quantity,
      }));
    try {
      const session = await startCheckout.mutateAsync({
        shippingAddressId: defaultShipping?.id,
        autoReserve: false,
        ...(buyNowItems?.length
          ? { items: buyNowItems }
          : cartLineItems.length
            ? { items: cartLineItems }
            : {}),
      });
      trackCommerceEvent('checkout_started');

      const dedupeKey = `meta_initiate_checkout_${session.checkoutToken}`;
      if (!sessionStorage.getItem(dedupeKey) && session.lines.length > 0) {
        sessionStorage.setItem(dedupeKey, '1');
        const metaPayload = buildMetaProductFromLines(
          session.lines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            salePrice: line.salePrice,
            lineSubtotal: line.lineSubtotal,
          })),
          session.currency ?? 'LKR',
          session.totals?.grandTotal,
        );
        const shippingPhone = session.shippingAddress?.phone;
        void trackingApi.initiateCheckout(
          metaPayload,
          checkoutEventId(session.checkoutToken),
          shippingPhone ? { phone: shippingPhone } : undefined,
        );
      }
    } catch (error) {
      // Stock / cart validation failures belong on the bag, not the checkout form.
      if (
        AppError.isAppError(error) &&
        (error.code === 'CHECKOUT_INVALID' ||
          error.code === 'OUT_OF_STOCK' ||
          error.code === 'INSUFFICIENT_STOCK' ||
          error.code === 'CART_EMPTY')
      ) {
        useCheckoutStore.getState().resetCheckoutUi();
        void navigate({ to: ROUTES.cart });
        return;
      }
      throw error;
    }
  };

  // Open guest bridge when arriving logged out; clear stale checkout tokens.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthed) {
      setGuestBridgeOpen(true);
      if (useCheckoutStore.getState().checkoutToken) {
        useCheckoutStore.getState().resetCheckoutUi();
      }
      startedRef.current = false;
    }
  }, [hasHydrated, isAuthed]);

  // Start/refresh checkout from the live cart after guest bridge finishes.
  // Always call start (resume path refreshes lines) — never reuse a stale token alone.
  useEffect(() => {
    if (!hasHydrated || !isAuthed || guestBridgeOpen) return;
    if (startedRef.current) return;
    // Cart may still be priming /checkout/start — poll briefly then bootstrap if needed.
    if (useCheckoutStore.getState().isPrimingCheckout) {
      const timer = window.setInterval(() => {
        if (useCheckoutStore.getState().isPrimingCheckout) return;
        window.clearInterval(timer);
        if (useCheckoutStore.getState().checkoutToken) {
          startedRef.current = true;
          return;
        }
        if (startedRef.current) return;
        startedRef.current = true;
        void beginCheckout().catch(() => {
          /* surfaced via mutation state */
        });
      }, 50);
      return () => window.clearInterval(timer);
    }

    startedRef.current = true;

    void (async () => {
      try {
        await beginCheckout();
      } catch {
        /* surfaced via mutation state */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per ready auth
  }, [hasHydrated, isAuthed, guestBridgeOpen, navigate, startCheckout]);

  const handleGuestAuthenticated = () => {
    startedRef.current = false;
    setGuestBridgeOpen(false);
  };

  // Stale completed/cancelled tokens: clear and start a fresh session automatically.
  useEffect(() => {
    const closedError =
      isCheckoutClosedError(sessionQuery.error) || isCheckoutClosedError(startCheckout.error);
    if (!closedError || recoveringClosedRef.current) return;

    recoveringClosedRef.current = true;
    setRecoveringClosed(true);
    useCheckoutStore.getState().resetCheckoutUi();
    startedRef.current = true;

    void (async () => {
      try {
        await beginCheckout();
      } catch {
        /* surfaced via mutation state */
      } finally {
        recoveringClosedRef.current = false;
        setRecoveringClosed(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recover once per closed error
  }, [sessionQuery.error, startCheckout.error]);

  useEffect(() => {
    if (!addresses?.length) return;
    const hasValidSelection =
      Boolean(shippingAddressId) && addresses.some((address) => address.id === shippingAddressId);
    if (hasValidSelection) return;
    const defaultShipping = addresses.find((address) => address.isDefaultShipping) ?? addresses[0];
    if (defaultShipping?.id) setShippingAddressId(defaultShipping.id);
  }, [addresses, shippingAddressId, setShippingAddressId]);

  // Stale sessions that became out of stock after start — send shopper back to bag.
  useEffect(() => {
    const blocking = session?.validationIssues?.some(
      (issue) =>
        issue.severity !== 'warning' &&
        (issue.code === 'OUT_OF_STOCK' ||
          issue.code === 'INSUFFICIENT_STOCK' ||
          /out of stock|insufficient stock/i.test(issue.message)),
    );
    if (!blocking) return;
    useCheckoutStore.getState().resetCheckoutUi();
    void navigate({ to: ROUTES.cart });
  }, [session?.validationIssues, navigate]);

  useEffect(() => {
    if (!billingSameAsShipping || !shippingAddressId) return;
    setBillingAddressId(shippingAddressId);
  }, [billingSameAsShipping, shippingAddressId, setBillingAddressId]);

  const recovering =
    recoveringClosed || (isCheckoutClosedError(sessionQuery.error) && startCheckout.isPending);

  // Hide CHECKOUT_CLOSED while recovering into a new session.
  const bootstrapError = recovering
    ? null
    : isCheckoutClosedError(sessionQuery.error)
      ? startCheckout.error && !isCheckoutClosedError(startCheckout.error)
        ? startCheckout.error
        : null
      : (startCheckout.error ?? sessionQuery.error);

  const sessionPending =
    recovering ||
    isPrimingCheckout ||
    (!session && !bootstrapError && (startCheckout.isPending || sessionQuery.isLoading));
  const sessionReady = Boolean(session?.checkoutToken);

  const handleContinue = () => {
    if (!session?.checkoutToken || !shippingAddressId) return;
    const billingId = billingSameAsShipping ? shippingAddressId : billingAddressId;
    if (!billingId) return;

    // Instant step change — do not block the UI on network. Persist addresses in the
    // background; payment/review already heal missing snapshots if needed.
    useCheckoutStore.getState().setSelectedShippingMethod('standard');
    void navigate({ to: ROUTES.checkoutPayment });
    refreshCheckout.mutate({
      checkoutRef: session.checkoutToken,
      payload: {
        shippingAddressId,
        billingAddressId: billingId,
        shippingMethod: 'standard',
        deliveryMethod: 'delivery',
      },
    });
  };

  const handleExtend = () => {
    if (!session?.checkoutToken || !session.reservationIds?.length) return;
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

  if (hasHydrated && guestBridgeOpen) {
    return (
      <>
        <Seo title="Checkout" description="Continue checkout with your email." noIndex />
        <CheckoutGuestAuthDialog open onAuthenticated={handleGuestAuthenticated} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <section
            aria-labelledby="checkout-information-heading"
            className="min-w-0 space-y-5 sm:space-y-8"
          >
            <div>
              <h2 id="checkout-information-heading" className="text-base font-semibold sm:text-lg">
                Customer information
              </h2>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                Confirm your email in the popup to continue — shipping details unlock after sign-in.
              </p>
            </div>

            <div className="border-border bg-muted/30 space-y-3 rounded-xl border border-dashed p-4 sm:p-5">
              <p className="text-sm font-medium">Contact & shipping</p>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Email, password / OTP, and delivery address will appear here after you continue in
                the popup.
              </p>
            </div>

            {guestCart?.items?.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Your bag ({guestCart.items.length})</h3>
                <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-xl border">
                  {guestCart.items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      compact
                      className="border-0 px-3 last:border-0 sm:px-5"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Loading your bag…</p>
            )}
          </section>

          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {guestCart?.totals ? (
              <CartOrderSummary totals={guestCart.totals} validation={guestCart.validation} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </div>
        </div>
      </>
    );
  }

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
            useCheckoutStore.getState().resetCheckoutUi();
            startedRef.current = false;
            void navigate({ to: ROUTES.checkout, replace: true });
            window.location.reload();
          }}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <section aria-labelledby="checkout-information-heading" className="min-w-0">
          <h2 id="checkout-information-heading" className="text-base font-semibold sm:text-lg">
            Customer information
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {isGuestCheckout
              ? 'Add your delivery address to continue — no sign-in required.'
              : 'Choose shipping and billing addresses from your saved profile.'}
          </p>

          {!bootstrapError || session ? (
            <div className="mt-4 space-y-5 sm:mt-6 sm:space-y-8">
              {session ? (
                <>
                  <CheckoutExpiryBanner
                    session={session}
                    onExtend={handleExtend}
                    onRestart={handleRestart}
                    isExtending={refreshCheckout.isPending}
                  />
                  <CheckoutValidationAlert issues={session.validationIssues} />
                </>
              ) : sessionPending ? (
                <p className="text-muted-foreground text-xs" aria-live="polite">
                  Preparing checkout…
                </p>
              ) : null}

              <AddressPicker
                label="Shipping address"
                selectedId={shippingAddressId}
                onSelect={setShippingAddressId}
                preferInlineCreate={isGuestCheckout}
              />

              {!isGuestCheckout || Boolean(shippingAddressId) ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="billing-same-as-shipping"
                    checked={billingSameAsShipping}
                    onCheckedChange={(checked) => setBillingSameAsShipping(checked === true)}
                  />
                  <Label htmlFor="billing-same-as-shipping">Billing address same as shipping</Label>
                </div>
              ) : null}

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
                nextLabel="Continue to payment"
                nextDisabled={
                  !sessionReady ||
                  !shippingAddressId ||
                  (!billingSameAsShipping && !billingAddressId) ||
                  !addresses?.some((address) => address.id === shippingAddressId) ||
                  sessionPending
                }
              />
            </div>
          ) : (
            <div className="border-border mt-6 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">Unable to start checkout</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Return to your cart and try again.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  useCheckoutStore.getState().resetCheckoutUi();
                  void navigate({ to: ROUTES.cart });
                }}
              >
                Back to cart
              </Button>
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {session ? (
            <CheckoutOrderSummary session={session} editable />
          ) : (
            <>
              {guestCart?.items?.length ? (
                <div className="border-border bg-card divide-border space-y-0 overflow-hidden rounded-xl border">
                  <div className="border-border border-b px-3 py-2.5 sm:px-4 sm:py-3">
                    <h3 className="text-sm font-semibold">Your bag ({guestCart.items.length})</h3>
                  </div>
                  <div className="divide-border divide-y">
                    {guestCart.items.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        compact
                        className="border-0 px-3 last:border-0 sm:px-5"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {guestCart?.totals ? (
                <CartOrderSummary totals={guestCart.totals} validation={guestCart.validation} />
              ) : sessionPending ? (
                <div aria-busy="true">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
