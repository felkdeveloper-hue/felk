import { useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { useCartQuery } from '@/hooks/cart';
import { useAuthStore, useCheckoutStore } from '@/store';
import { AppError } from '@/lib/errors';
import { consumePaymentFailedFlag, trackCommerceEvent } from '@/lib/analytics';
import { formatCurrency } from '@/utils';
import { customersApi } from '@/services/sdk';
import { isGuestCheckoutUser } from '@/utils/auth/guest-checkout';
import { isStaffUser } from '@/utils/auth-redirect';
import { previewShippingAmount } from '@/constants/checkout.constants';
import { Zap, AlertTriangle } from 'lucide-react';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { CartOrderSummary } from '@/components/cart/cart-order-summary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { useCategorySlugLookup } from '@/hooks/use-flash-sale-eligibility';
import { computeFlashAdjustedSubtotal, computeFlashSaving } from '@/utils/flash-sale-eligibility';

function getIssueForItem(
  itemId: string,
  validation?: { issues?: Array<{ itemId?: string; reason: string }> },
) {
  return validation?.issues?.find((issue) => issue.itemId === itemId)?.reason;
}

function cartHasBlockingStockIssues(cart: {
  items: Array<{
    inStock?: boolean;
    stockStatus?: string;
    availableQuantity?: number;
    quantity: number;
  }>;
  validation?: { isValid?: boolean };
}) {
  if (cart.validation?.isValid === false) return true;
  return cart.items.some(
    (item) =>
      item.inStock === false ||
      item.stockStatus === 'out_of_stock' ||
      (typeof item.availableQuantity === 'number' && item.availableQuantity < item.quantity),
  );
}

export function CartPageContent() {
  const navigate = useNavigate();
  const cartQuery = useCartQuery();
  const queryClient = useQueryClient();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const authUser = useAuthStore((state) => state.user);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { isFlashSaleActive } = useFlashSale();
  const slugByCategoryId = useCategorySlugLookup();
  const isGuestCheckout = isGuestCheckoutUser(authUser);
  const isStaff = isStaffUser(authUser);
  const flashEnabled = isAuthed && isFlashSaleActive;

  const cart = cartQuery.data;
  const validation = cart?.validation;
  const checkoutBlocked = cart ? cartHasBlockingStockIssues(cart) : false;

  useEffect(() => {
    if (!hasHydrated || !isAuthed || isGuestCheckout || checkoutBlocked) return;
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.customers.addresses(),
      queryFn: () => customersApi.listAddresses(),
      staleTime: 1000 * 60 * 2,
    });
    void import('@/pages/checkout/information.page');
    void import('@/pages/checkout/payment.page');
  }, [checkoutBlocked, hasHydrated, isAuthed, isGuestCheckout, queryClient]);

  useEffect(() => {
    if (consumePaymentFailedFlag()) {
      trackCommerceEvent('returned_to_cart');
    }
  }, []);

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (cartQuery.isError) {
    const error = AppError.isAppError(cartQuery.error)
      ? cartQuery.error
      : AppError.fromUnknown(cartQuery.error);
    return (
      <ErrorState
        title={error.isNetworkError ? 'You appear to be offline' : 'Unable to load cart'}
        description={error.message}
        onRetry={() => cartQuery.refetch()}
      />
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="border-border/80 bg-muted/40 mx-auto max-w-6xl rounded-[2rem] border border-dashed px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-bold uppercase">Your bag is empty</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Browse the catalog and add pieces you love.
        </p>
        <Button asChild className="mt-6">
          <Link to={ROUTES.products}>Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const flashSubtotal =
    flashEnabled && cart.items.length
      ? computeFlashAdjustedSubtotal(cart.items, slugByCategoryId)
      : null;
  const flashSaving =
    flashSubtotal !== null && cart.items.length
      ? computeFlashSaving(cart.items, slugByCategoryId)
      : 0;
  const hasFlashDiscount = flashSaving > 0;
  const shippingAmount = previewShippingAmount(cart.totals.shipping, isStaff);
  const regularTotal =
    cart.totals.shipping > 0 ? cart.totals.total : cart.totals.total + shippingAmount;
  const flashGrandTotal =
    flashSubtotal !== null && hasFlashDiscount
      ? Math.round(
          flashSubtotal + shippingAmount + (cart.totals.tax ?? 0) - (cart.totals.discount ?? 0),
        )
      : null;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <section aria-labelledby="cart-items-heading" className="min-w-0 space-y-4 pb-28 lg:pb-0">
        <h2 id="cart-items-heading" className="sr-only">
          Bag items ({cart.items.length})
        </h2>

        {checkoutBlocked ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertTitle>Some items are unavailable</AlertTitle>
            <AlertDescription>
              Remove out-of-stock items from your bag before you can continue to checkout.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-xl border">
          <AnimatePresence initial={false}>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                className="border-0 px-3 last:border-0 sm:px-5"
                validationMessage={getIssueForItem(item.id, validation)}
              />
            ))}
          </AnimatePresence>
        </div>
      </section>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CartOrderSummary totals={cart.totals} items={cart.items} validation={validation} />
        <div className="hidden space-y-3 lg:block">
          {!hasHydrated ? (
            <Button className="w-full" size="lg" disabled loading>
              Proceed to checkout
            </Button>
          ) : checkoutBlocked ? (
            <Button className="w-full" size="lg" disabled>
              Remove unavailable items to checkout
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                useCheckoutStore.getState().resetCheckoutUi();
                queryClient.removeQueries({ queryKey: ['checkout'] });
                void navigate({ to: ROUTES.checkout });
              }}
            >
              Proceed to checkout
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to={ROUTES.products}>Continue shopping</Link>
          </Button>
        </div>
      </div>

      <div
        className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/90 fixed inset-x-0 z-[85] border-t px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.16em]">
              Total
            </span>
            {flashEnabled && hasFlashDiscount ? (
              <span className="flex items-baseline gap-1.5">
                <Zap className="mb-0.5 size-3.5 shrink-0" style={{ color: '#f97316' }} />
                <span className="text-muted-foreground text-sm tabular-nums line-through">
                  {formatCurrency(regularTotal, cart.totals.currency ?? 'LKR')}
                </span>
                <span
                  className="font-display text-lg font-bold tabular-nums tracking-tight"
                  style={{ color: '#f97316' }}
                >
                  {formatCurrency(flashGrandTotal ?? regularTotal, cart.totals.currency ?? 'LKR')}
                </span>
              </span>
            ) : (
              <span className="font-display text-foreground text-lg font-bold tabular-nums tracking-tight">
                {formatCurrency(regularTotal, cart.totals.currency ?? 'LKR')}
              </span>
            )}
          </div>
          {!hasHydrated ? (
            <Button
              className="h-11 w-full rounded-none text-[12px] font-bold uppercase tracking-[0.1em]"
              size="lg"
              disabled
              loading
            >
              Proceed to checkout
            </Button>
          ) : checkoutBlocked ? (
            <Button
              className="h-11 w-full rounded-none text-[12px] font-bold uppercase tracking-[0.1em]"
              size="lg"
              disabled
            >
              Remove unavailable items
            </Button>
          ) : (
            <Button
              className="h-11 w-full rounded-none text-[12px] font-bold uppercase tracking-[0.1em]"
              size="lg"
              onClick={() => {
                useCheckoutStore.getState().resetCheckoutUi();
                queryClient.removeQueries({ queryKey: ['checkout'] });
                void navigate({ to: ROUTES.checkout });
              }}
            >
              Proceed to checkout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
