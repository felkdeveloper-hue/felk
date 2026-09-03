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
import {
  NavbarBagIcon,
  NavbarIconBadge,
  NavbarProfileIcon,
  navbarActionBtnClass,
  navbarLucideIconProps,
} from '@/components/layout/navbar-action-icons';

const DEFAULT_NAV: NavItem[] = [
  { label: 'Women', href: ROUTES.products, gender: 'women' },
  { label: 'Browse', href: ROUTES.categories },
  { label: 'Contact', href: ROUTES.contact },
];

export interface StorefrontHeaderProps {
  navItems?: NavItem[];
}

export function StorefrontHeader({ navItems = DEFAULT_NAV }: StorefrontHeaderProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isCheckout = pathname.startsWith(ROUTES.checkout);
  const { isScrolled, isHidden } = useScrollHeader({
    threshold: 36,
    // Keep mobile navbar visible while scrolling (no auto-hide).
    hideOnScrollDown: false,
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
  const actionBtn = navbarActionBtnClass(lightChrome);
  const lucideIcon = navbarLucideIconProps();

  return (
    <header
      data-slot="storefront-header"
      className={cn(
        'sticky top-0 z-[100] transition-[background-color,box-shadow,border-color,backdrop-filter,color,transform] duration-200 ease-out lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
        'max-lg:pt-[env(safe-area-inset-top,0px)]',
        // Auto-hide on scroll down — mobile only; desktop never translates.
        isHidden && '-translate-y-full lg:translate-y-0',
        transparent
          ? 'border-transparent bg-transparent text-white'
          : frosted
            ? 'border-b border-white/5 bg-black/20 text-white shadow-none backdrop-blur-[4px]'
            : 'bg-background text-foreground border-border/70 border-b shadow-[0_8px_28px_-20px_rgba(0,0,0,0.28)]',
      )}
    >
      <Container className="relative lg:grid lg:h-[4.75rem] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:justify-normal lg:gap-6">
        {/* ── Mobile navbar: ☰  FASHION EDGE  🔍 🔔 ── */}
        <div className="grid h-14 w-full grid-cols-[auto_1fr_auto] items-center lg:hidden">
          <div className="z-10 flex shrink-0 items-center">
            <MobileNav
              items={navItems}
              activeHref={pathname}
              transparent={lightChrome}
              open={mobileNavOpen}
              onOpenChange={setMobileNavOpen}
            />
          </div>

          <div className="z-20 flex min-w-0 items-center justify-center px-1">
            <Link
              to={ROUTES.home}
              preload="intent"
              className={cn(
                'max-w-[min(58vw,12.5rem)] truncate whitespace-nowrap font-serif text-[clamp(0.9375rem,3.9vw,1.125rem)] font-normal uppercase leading-none tracking-[0.14em] transition-opacity hover:opacity-80 active:opacity-70',
                lightChrome ? 'text-white drop-shadow-sm' : 'text-foreground',
              )}
              aria-label={`${storeName}, go to home`}
            >
              Fashion Edge
            </Link>
          </div>

          <div className="z-10 flex shrink-0 items-center justify-end">
            <button
              type="button"
              aria-label="Search"
              onClick={toggleSearch}
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center transition-opacity duration-150 active:opacity-70',
                lightChrome ? 'text-white' : 'text-foreground',
              )}
            >
              <Search {...lucideIcon} />
            </button>
            <NotificationBell lightChrome={lightChrome} minimal />
          </div>
        </div>

        {/* ── Desktop navbar (unchanged) ── */}
        <div className="hidden min-w-0 shrink-0 items-center gap-1 sm:gap-2 lg:flex">
          <Link
            to={ROUTES.home}
            preload="intent"
            className={cn(
              'flex shrink-0 items-center transition-opacity hover:opacity-90',
              lightChrome ? 'drop-shadow-sm' : undefined,
            )}
            aria-label={storeName}
          >
            <FeLogo size={34} inverted={lightChrome} className="lg:h-[46px] lg:w-[46px]" />
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

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1 lg:flex lg:flex-none">
          <HeaderSearchField
            lightChrome={lightChrome}
            className="hidden w-40 shrink-0 xl:block xl:w-48 2xl:w-56"
          />

          {/* Desktop / tablet — keep timer in the action cluster */}
          {!isCheckout ? <FlashSaleCountdown className="hidden shrink-0 sm:flex" /> : null}

          <div className="flex shrink-0 items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={toggleSearch}
              className={cn('xl:hidden', actionBtn)}
            >
              <Search {...lucideIcon} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}
              asChild
              className={cn('relative hidden sm:inline-flex', actionBtn)}
            >
              <Link to={ROUTES.wishlist} preload="intent">
                <Heart {...lucideIcon} />
                {wishlistCount > 0 ? (
                  <NavbarIconBadge count={wishlistCount} className="right-1 top-1" />
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
                    className={actionBtn}
                  >
                    <NavbarProfileIcon />
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
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign in"
                asChild
                className={actionBtn}
              >
                <Link to={ROUTES.authLogin} preload="intent">
                  <NavbarProfileIcon />
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}
              asChild
              className={cn('relative', actionBtn)}
            >
              <Link to={ROUTES.cart} preload="intent">
                <NavbarBagIcon />
                {cartCount > 0 ? (
                  <NavbarIconBadge count={cartCount} className="right-1 top-1" />
                ) : null}
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}
