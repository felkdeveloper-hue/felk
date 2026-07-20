import { Link } from '@tanstack/react-router';
import { AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/constants';
import { useCartQuery } from '@/hooks/cart';
import { AppError } from '@/lib/errors';
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
      <section aria-labelledby="cart-items-heading" className="space-y-4">
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
        <Button asChild className="w-full" size="lg">
          <Link to={ROUTES.checkout}>Proceed to checkout</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to={ROUTES.products}>Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
