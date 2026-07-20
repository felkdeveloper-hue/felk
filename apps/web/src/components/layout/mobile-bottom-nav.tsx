import { Link, useRouterState } from '@tanstack/react-router';
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { selectCartItemCount, useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store';
import { useWishlistItemCountQuery } from '@/hooks/wishlist';

const items = [
  { label: 'Home', href: ROUTES.home, icon: Home },
  { label: 'Shop', href: ROUTES.products, icon: Search, search: true },
  { label: 'Wishlist', href: ROUTES.wishlist, icon: Heart },
  { label: 'Bag', href: ROUTES.cart, icon: ShoppingBag, cart: true },
  { label: 'Account', href: ROUTES.account, icon: User, account: true },
] as const;

/** Fixed mobile tab bar for thumb-friendly storefront navigation. */
export function MobileBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const cartCount = useCartStore(selectCartItemCount);
  const toggleSearch = useUiStore((state) => state.toggleSearch);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();

  return (
    <nav
      aria-label="Mobile"
      className="glass-panel border-border/70 fixed inset-x-3 bottom-3 z-50 rounded-2xl border shadow-[var(--shadow-elevated)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="grid grid-cols-5 gap-1 px-1 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === ROUTES.home ? pathname === ROUTES.home : pathname.startsWith(item.href);

          if ('search' in item && item.search) {
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={toggleSearch}
                  className={cn(
                    'relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              </li>
            );
          }

          const href =
            'account' in item && item.account && !isAuthed ? ROUTES.authLogin : item.href;

          return (
            <li key={item.label}>
              <Link
                to={href}
                preload="intent"
                className={cn(
                  'relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {'cart' in item && item.cart && cartCount > 0 ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-accent text-accent-foreground absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </motion.span>
                  ) : null}
                  {item.label === 'Wishlist' && wishlistCount > 0 ? (
                    <span className="bg-accent text-accent-foreground absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="bg-foreground absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full"
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
