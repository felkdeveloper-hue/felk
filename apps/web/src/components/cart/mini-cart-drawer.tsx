import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useCartQuery } from '@/hooks/cart';
import { useUiStore } from '@/store/ui-store';
import { selectCartItemCount } from '@/store/cart-store';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/utils';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

export function MiniCartDrawer() {
  const open = useUiStore((state) => state.isCartDrawerOpen);
  const setOpen = useUiStore((state) => state.setCartDrawerOpen);
  const cartCount = useCartStore(selectCartItemCount);
  const { data: cart, isLoading, isError, refetch } = useCartQuery({ enabled: open });

  const items = cart?.items ?? [];
  const currency = cart?.totals.currency ?? 'LKR';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="border-l-border/70 flex w-full flex-col rounded-l-[1.75rem] sm:max-w-md"
        aria-labelledby="mini-cart-title"
      >
        <SheetHeader>
          <SheetTitle id="mini-cart-title" className="font-display text-2xl font-bold uppercase">
            Your bag ({cartCount})
          </SheetTitle>
          <SheetDescription>Review items before checkout.</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-muted-foreground text-sm">Unable to load your cart.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center"
          >
            <ShoppingBag className="text-muted-foreground size-10" aria-hidden />
            <div>
              <p className="font-medium">Your bag is empty</p>
              <p className="text-muted-foreground text-sm">Discover something you love.</p>
            </div>
            <Button asChild onClick={() => setOpen(false)}>
              <Link to={ROUTES.products}>Continue shopping</Link>
            </Button>
          </motion.div>
        ) : null}

        {!isLoading && !isError && items.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto py-2">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <CartItemRow key={item.id} item={item} compact />
                ))}
              </AnimatePresence>
            </div>

            <div className="border-border space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.totals.subtotal ?? 0, currency)}</span>
              </div>
              <Button asChild className="w-full" onClick={() => setOpen(false)}>
                <Link to={ROUTES.checkout}>Proceed to checkout</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
                <Link to={ROUTES.cart}>View cart</Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)} asChild>
                <Link to={ROUTES.products}>Continue shopping</Link>
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
