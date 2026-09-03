import { Link, useRouterState } from '@tanstack/react-router';
import { CircleUser, Heart, ShoppingCart, SlidersHorizontal, Store } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useWishlistItemCountQuery } from '@/hooks/wishlist';
import { useAuthStore } from '@/store';
import { selectCartItemCount, useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

/** Shared outline icon spec — one consistent Lucide family. */
const ICON = {
  size: 22,
  strokeWidth: 1.5,
} as const;

type NavItemDef = {
  id: string;
  label: string;
  icon: typeof Store;
  to?: string;
  search?: Record<string, string>;
  action?: 'filters';
};

/** Default shop landing — women collection (not a category PLP like All Top Wear). */
const SHOP_HREF = {
  to: ROUTES.products,
  search: { gender: 'women' },
} as const;

/** Home + non-catalog mobile pages — matches reference: Shop | Wishlist | Cart | My account */
const HOME_ITEMS: NavItemDef[] = [
  { id: 'shop', label: 'Shop', to: SHOP_HREF.to, search: SHOP_HREF.search, icon: Store },
  { id: 'wishlist', label: 'Wishlist', to: ROUTES.wishlist, icon: Heart },
  { id: 'cart', label: 'Cart', to: ROUTES.cart, icon: ShoppingCart },
  { id: 'account', label: 'My account', to: ROUTES.account, icon: CircleUser },
];

/** Catalog / products mobile pages — keep existing 5-item layout */
const SHOP_ITEMS: NavItemDef[] = [
  { id: 'shop', label: 'Shop', to: SHOP_HREF.to, search: SHOP_HREF.search, icon: Store },
  { id: 'filters', label: 'Filters', action: 'filters', icon: SlidersHorizontal },
  { id: 'wishlist', label: 'Wishlist', to: ROUTES.wishlist, icon: Heart },
  { id: 'cart', label: 'Cart', to: ROUTES.cart, icon: ShoppingCart },
  { id: 'account', label: 'My Account', to: ROUTES.account, icon: CircleUser },
];

function isShopRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.products ||
    pathname === ROUTES.search ||
    pathname.startsWith('/categories/')
  );
}

function NavBadge({ count }: { count: number }) {
  const display = count > 9 ? '9+' : String(count);
  return (
    <span
      data-radius="pill"
      className="pointer-events-none absolute -right-1.5 -top-1 flex size-[15px] min-w-[15px] items-center justify-center rounded-full text-[8px] font-semibold leading-none text-white"
      style={{ background: '#E53935' }}
    >
      {display}
    </span>
  );
}

/**
 * Context-aware mobile tab bar — home layout vs shop/catalog layout.
 * Hidden from `lg` up so desktop chrome stays unchanged.
 */
export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const requestCatalogFiltersOpen = useUiStore((s) => s.requestCatalogFiltersOpen);
  const cartCount = useCartStore(selectCartItemCount);
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();
  const isAuthed = useAuthStore((s) => Boolean(s.accessToken && s.user));

  const items = isShopRoute(pathname) ? SHOP_ITEMS : HOME_ITEMS;

  return (
    <nav
      aria-label="Primary"
      className="border-border/40 bg-background fixed inset-x-0 bottom-0 z-[90] border-t shadow-[0_-1px_12px_-4px_rgba(0,0,0,0.08)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex h-14 w-full items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isAction = Boolean(item.action);
          const href = item.id === 'account' && !isAuthed ? ROUTES.authLogin : item.to;

          const active =
            !isAction &&
            Boolean(
              href &&
              (pathname === href ||
                (item.id === 'shop' &&
                  (pathname === ROUTES.products ||
                    pathname.startsWith('/categories/') ||
                    pathname.startsWith(ROUTES.search))) ||
                (href !== ROUTES.home && href !== ROUTES.products && pathname.startsWith(href))),
            );

          const badge =
            item.id === 'cart' && cartCount > 0
              ? cartCount
              : item.id === 'wishlist' && wishlistCount > 0
                ? wishlistCount
                : 0;

          const className = cn(
            'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pt-0.5 text-[10px] transition-colors duration-150 active:opacity-70',
            active ? 'font-semibold text-foreground' : 'font-normal text-neutral-400',
          );

          const iconEl = (
            <span className="relative inline-flex items-center justify-center">
              <Icon
                size={ICON.size}
                strokeWidth={active ? 2 : ICON.strokeWidth}
                className={active ? 'text-foreground' : 'text-neutral-500'}
                aria-hidden
              />
              {badge > 0 ? <NavBadge count={badge} /> : null}
            </span>
          );

          if (item.action === 'filters') {
            return (
              <li key={item.id} className="flex flex-1">
                <button
                  type="button"
                  className={className}
                  aria-label="Open filters"
                  onClick={() => requestCatalogFiltersOpen()}
                >
                  {iconEl}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex flex-1">
              <Link
                to={href!}
                search={item.search}
                preload="intent"
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                {iconEl}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
