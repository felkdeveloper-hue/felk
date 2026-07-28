import { Link, useRouterState } from '@tanstack/react-router';
import { Heart, Home, Search, ShoppingBag, UserRound, LayoutGrid } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useWishlistItemCountQuery } from '@/hooks/wishlist';
import { useAuthStore } from '@/store';
import { selectCartItemCount, useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

const items = [
  { id: 'home', label: 'Home', to: ROUTES.home, icon: Home },
  { id: 'categories', label: 'Categories', to: ROUTES.categories, icon: LayoutGrid },
  { id: 'search', label: 'Search', action: 'search' as const, icon: Search },
  { id: 'wishlist', label: 'Wishlist', to: ROUTES.wishlist, icon: Heart },
  { id: 'cart', label: 'Cart', to: ROUTES.cart, icon: ShoppingBag },
  { id: 'profile', label: 'Profile', to: ROUTES.account, icon: UserRound },
] as const;

/**
 * Sticky mobile tab bar — Nike / Zara / Apple Store pattern.
 * Hidden from `lg` up so desktop chrome stays unchanged.
 */
export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const cartCount = useCartStore(selectCartItemCount);
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken && s.user));

  return (
    <nav
      aria-label="Primary"
      className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/90 fixed inset-x-0 bottom-0 z-[90] border-t backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isSearch = 'action' in item && item.action === 'search';
          const href = 'to' in item ? item.to : undefined;
          const profileHref = item.id === 'profile' && !isAuthed ? ROUTES.authLogin : href;
          const active =
            !isSearch &&
            Boolean(
              profileHref &&
              (pathname === profileHref ||
                (profileHref !== ROUTES.home && pathname.startsWith(profileHref))),
            );

          const badge =
            item.id === 'cart' && cartCount > 0
              ? cartCount > 9
                ? '9+'
                : String(cartCount)
              : item.id === 'wishlist' && wishlistCount > 0
                ? wishlistCount > 9
                  ? '9+'
                  : String(wishlistCount)
                : null;

          const className = cn(
            'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium tracking-wide transition-colors duration-150 active:opacity-70',
            active ? 'text-foreground' : 'text-muted-foreground',
          );

          if (isSearch) {
            return (
              <li key={item.id} className="flex flex-1">
                <button
                  type="button"
                  className={className}
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Icon className="size-[1.15rem]" strokeWidth={1.5} aria-hidden />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          }

          if (item.id === 'categories') {
            return (
              <li key={item.id} className="flex flex-1">
                <button
                  type="button"
                  className={className}
                  aria-label="Open categories"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Icon className="size-[1.15rem]" strokeWidth={1.5} aria-hidden />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex flex-1">
              <Link
                to={profileHref!}
                preload="intent"
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                <span className="relative">
                  <Icon className="size-[1.15rem]" strokeWidth={1.5} aria-hidden />
                  {badge ? (
                    <span className="bg-accent text-accent-foreground absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full text-[8px] font-semibold">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
