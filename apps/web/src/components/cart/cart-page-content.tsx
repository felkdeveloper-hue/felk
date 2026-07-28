import { Link } from '@tanstack/react-router';
import { AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/constants';
import { useCartQuery } from '@/hooks/cart';
import { useAuthStore } from '@/store';
import { AppError } from '@/lib/errors';
import { formatCurrency } from '@/utils';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { CartOrderSummary } from '@/components/cart/cart-order-summary';
import { CartPromotionsPanel } from '@/components/cart/cart-promotions-panel';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

function getIssueForItem(
  itemId: string,
  validation?: { issues?: Array<{ itemId?: string; reason: string }> },
) {
  return validation?.issues?.find((issue) => issue.itemId === itemId)?.reason;
}

export function CartPageContent() {
  const cartQuery = useCartQuery();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));

  const cart = cartQuery.data;
  const validation = cart?.validation;

  if (cartQuery.isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
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
      <div className="border-border/80 bg-muted/40 rounded-[2rem] border border-dashed px-6 py-20 text-center">
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="cart-items-heading" className="space-y-4 pb-28 lg:pb-0">
        <h2 id="cart-items-heading" className="sr-only">
          Bag items ({cart.items.length})
        </h2>

        <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-xl border">
          <AnimatePresence initial={false}>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                className="border-0 px-4 last:border-0 sm:px-5"
                validationMessage={getIssueForItem(item.id, validation)}
              />
            ))}
          </AnimatePresence>
        </div>
      </section>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CartPromotionsPanel />
        <CartOrderSummary totals={cart.totals} validation={validation} />
        <div className="hidden space-y-3 lg:block">
          {!hasHydrated ? (
            <Button className="w-full" size="lg" disabled loading>
              Proceed to checkout
            </Button>
          ) : isAuthed ? (
            <Button asChild className="w-full" size="lg">
              <Link to={ROUTES.checkout}>Proceed to checkout</Link>
            </Button>
          ) : (
            <Button asChild className="w-full" size="lg">
              <Link to={ROUTES.authLogin} search={{ redirect: ROUTES.checkout }}>
                Sign in to checkout
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to={ROUTES.products}>Continue shopping</Link>
          </Button>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div
        className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/90 fixed inset-x-0 z-[85] border-t px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.16em]">
              Total
            </span>
            <span className="font-display text-foreground text-lg font-bold tabular-nums tracking-tight">
              {formatCurrency(cart.totals.total, cart.totals.currency ?? 'LKR')}
            </span>
          </div>
          {!hasHydrated ? (
            <Button
              className="h-12 w-full rounded-none text-sm font-bold uppercase tracking-[0.14em]"
              size="lg"
              disabled
              loading
            >
              Checkout
            </Button>
          ) : isAuthed ? (
            <Button
              asChild
              className="h-12 w-full rounded-none text-sm font-bold uppercase tracking-[0.14em]"
              size="lg"
            >
              <Link to={ROUTES.checkout}>Checkout</Link>
            </Button>
          ) : (
            <Button
              asChild
              className="h-12 w-full rounded-none text-sm font-bold uppercase tracking-[0.14em]"
              size="lg"
            >
              <Link to={ROUTES.authLogin} search={{ redirect: ROUTES.checkout }}>
                Sign in to checkout
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
