import { Link, useRouterState } from '@tanstack/react-router';
import { Heart, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants';
import { useLogoutMutation } from '@/hooks/auth';
import { useWishlistItemCountQuery } from '@/hooks/wishlist';
import { usePublicSettings } from '@/hooks/cms';
import { useScrollHeader } from '@/hooks/storefront';
import { useAuthStore } from '@/store';
import { selectCartItemCount, useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import { getSetting } from '@/utils/cms';
import { siteConfig } from '@/config';
import { FeLogo } from '@/components/brand/fe-logo';
import { Button } from '@/components/ui/button';
import { HeaderSearchField } from '@/components/search/header-search-field';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Container } from '@/components/layout/container';
import { MainNav, type NavItem } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { GenderMegaMenu } from '@/components/navigation/gender-mega-menu';
import { MegaMenuPlaceholder } from '@/components/navigation/mega-menu-placeholder';
import { NotificationBell } from '@/components/storefront/notification-bell';
import { FlashSaleCountdown } from '@/components/storefront/flash-sale-countdown';

const DEFAULT_NAV: NavItem[] = [
  { label: 'Women', href: ROUTES.products, gender: 'women' },
  { label: 'Browse', href: ROUTES.categories },
  { label: 'Contact', href: ROUTES.contact },
];

const iconStroke = '[&_svg]:size-[1.15rem] [&_svg]:stroke-[1.35]';

/** Minimal bob-style profile silhouette (img-2 reference). */
function PremiumProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3.25c-2.95 0-5.35 2.35-5.35 5.25 0 1.55.68 2.95 1.75 3.85-1.35.85-2.9 2.45-2.9 4.65V19h12.5v-2c0-2.2-1.55-3.8-2.9-4.65 1.07-.9 1.75-2.3 1.75-3.85 0-2.9-2.4-5.25-5.35-5.25zm0 1.75c1.55 0 2.8 1.15 2.8 2.55 0 1.4-1.25 2.55-2.8 2.55s-2.8-1.15-2.8-2.55c0-1.4 1.25-2.55 2.8-2.55z" />
    </svg>
  );
}

/** Minimal shopping bag icon (img-3 reference). */
function PremiumCartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.25 9V7.75a3.75 3.75 0 1 1 7.5 0V9" />
      <path d="M6.75 9h10.5l-.85 10.25H7.6L6.75 9Z" />
    </svg>
  );
}

export interface StorefrontHeaderProps {
  navItems?: NavItem[];
}

export function StorefrontHeader({ navItems = DEFAULT_NAV }: StorefrontHeaderProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isCheckout = pathname.startsWith(ROUTES.checkout);
  const { isScrolled, isHidden } = useScrollHeader({
    threshold: 36,
    // Auto-hide on checkout clips titles under the bar — keep it pinned there.
    hideOnScrollDown: !isCheckout,
  });
  const isHome = pathname === ROUTES.home;
  const transparent = isHome && !isScrolled;
  const frosted = isHome && isScrolled;
  // Home chrome is always white text/icons (clear at top, dark glass when scrolled).
  const lightChrome = transparent || frosted;

  const { data: settings } = usePublicSettings();
  const storeName =
    getSetting<string>(settings, 'store.name') ??
    getSetting<string>(settings, 'storeName') ??
    siteConfig.name;

  const cartCount = useCartStore(selectCartItemCount);
  const toggleSearch = useUiStore((state) => state.toggleSearch);
  const mobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();
  const accountLabel = user?.firstName ?? user?.email?.split('@')[0] ?? 'Account';
  const iconBtn = cn(
    'size-11 shrink-0',
    iconStroke,
    lightChrome
      ? 'text-white hover:bg-white/10 hover:text-white'
      : 'text-foreground hover:bg-muted/70 hover:text-foreground',
  );

  return (
    <header
      data-slot="storefront-header"
      className={cn(
        'sticky top-0 z-[100] transition-[background-color,box-shadow,border-color,backdrop-filter,color,transform] duration-200 ease-out lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
        // Auto-hide on scroll down — mobile only; desktop never translates.
        isHidden && '-translate-y-full lg:translate-y-0',
        transparent
          ? 'border-transparent bg-transparent text-white'
          : frosted
            ? 'border-b border-white/5 bg-black/20 text-white shadow-none backdrop-blur-[4px]'
            : 'bg-background text-foreground border-border/70 border-b shadow-[0_8px_28px_-20px_rgba(0,0,0,0.28)]',
      )}
    >
      <Container className="flex h-14 items-center justify-between gap-2 lg:grid lg:h-[4.75rem] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:justify-normal lg:gap-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <MobileNav
            items={navItems}
            activeHref={pathname}
            transparent={lightChrome}
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
          />
          <Link
            to={ROUTES.home}
            preload="intent"
            className={cn(
              'flex items-center transition-opacity hover:opacity-90',
              lightChrome ? 'drop-shadow-sm' : undefined,
            )}
            aria-label={storeName}
          >
            <FeLogo size={40} inverted={lightChrome} className="lg:h-[46px] lg:w-[46px]" />
          </Link>
        </div>

        <MainNav
          items={navItems}
          activeHref={pathname}
          transparent={lightChrome}
          className="gap-6 justify-self-center xl:gap-8"
          renderItem={(item) => {
            if (item.label === 'Women') {
              return (
                <GenderMegaMenu menuKey="women" transparent={lightChrome} activeHref={pathname} />
              );
            }
            if (item.label === 'Browse') {
              return <MegaMenuPlaceholder transparent={lightChrome} />;
            }
            return undefined;
          }}
        />

        <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
          <HeaderSearchField
            lightChrome={lightChrome}
            className="hidden w-40 shrink-0 xl:block xl:w-48 2xl:w-56"
          />

          <FlashSaleCountdown lightChrome={lightChrome} className="hidden sm:flex" />

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={toggleSearch}
              className={cn('xl:hidden', iconBtn)}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}
              asChild
              className={cn('relative hidden sm:inline-flex', iconBtn)}
            >
              <Link to={ROUTES.wishlist} preload="intent">
                <Heart />
                {wishlistCount > 0 ? (
                  <span className="bg-accent text-accent-foreground absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-semibold tracking-tight">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                ) : null}
              </Link>
            </Button>

            {/* Notification bell */}
            <NotificationBell lightChrome={lightChrome} />

            {isAuthed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Account, ${accountLabel}`}
                    className={iconBtn}
                  >
                    <PremiumProfileIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44 rounded-none">
                  <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium tracking-wide">
                    Hi, {accountLabel}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={ROUTES.account}>My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ROUTES.wishlist}>My Wishlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ROUTES.accountOrders}>My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" aria-label="Sign in" asChild className={iconBtn}>
                <Link to={ROUTES.authLogin} preload="intent">
                  <PremiumProfileIcon />
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}
              asChild
              className={cn('relative', iconBtn)}
            >
              <Link to={ROUTES.cart} preload="intent">
                <PremiumCartIcon />
                {cartCount > 0 ? (
                  <span className="bg-accent text-accent-foreground absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-semibold tracking-tight">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}
