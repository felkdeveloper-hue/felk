import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Heart, LogOut, Search, ShoppingBag, UserRound } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Container } from '@/components/layout/container';
import { MainNav, type NavItem } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { GenderMegaMenu } from '@/components/navigation/gender-mega-menu';
import { MegaMenuPlaceholder } from '@/components/navigation/mega-menu-placeholder';

const DEFAULT_NAV: NavItem[] = [
  { label: 'Women', href: ROUTES.products, gender: 'women' },
  { label: 'Accessories', href: '/categories/accessories' },
  { label: 'Browse', href: ROUTES.categories },
  { label: 'Contact', href: ROUTES.contact },
];

const iconStroke = '[&_svg]:size-[1.15rem] [&_svg]:stroke-[1.35]';

export interface StorefrontHeaderProps {
  navItems?: NavItem[];
}

export function StorefrontHeader({ navItems = DEFAULT_NAV }: StorefrontHeaderProps) {
  const isScrolled = useScrollHeader({ threshold: 36 });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const isHome = pathname === ROUTES.home;
  const transparent = isHome && !isScrolled;
  const frosted = isHome && isScrolled;
  // Home chrome is always white text/icons (clear at top, dark glass when scrolled).
  const lightChrome = transparent || frosted;

  const { data: settings } = usePublicSettings();
  const storeName =
    getSetting<string>(settings, 'store.name') ?? getSetting<string>(settings, 'storeName') ?? 'FE';

  const cartCount = useCartStore(selectCartItemCount);
  const toggleSearch = useUiStore((state) => state.toggleSearch);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();
  const [searchQuery, setSearchQuery] = useState('');

  const accountLabel = user?.firstName ?? user?.email?.split('@')[0] ?? 'Account';
  const iconBtn = cn(
    iconStroke,
    lightChrome
      ? 'text-white hover:bg-white/10 hover:text-white'
      : 'text-foreground hover:bg-muted/70 hover:text-foreground',
  );

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = searchQuery.trim();
    const path = value ? `${ROUTES.search}?q=${encodeURIComponent(value)}` : ROUTES.search;
    void navigate({ to: path as typeof ROUTES.search });
  };

  return (
    <header
      data-slot="storefront-header"
      className={cn(
        'sticky top-0 z-[100] transition-[background-color,box-shadow,border-color,backdrop-filter,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        transparent
          ? 'border-transparent bg-transparent text-white'
          : frosted
            ? 'border-b border-white/5 bg-black/20 text-white shadow-none backdrop-blur-[4px]'
            : 'bg-background text-foreground border-border/70 border-b shadow-[0_8px_28px_-20px_rgba(0,0,0,0.28)]',
      )}
    >
      <Container className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 lg:h-[4.75rem] lg:gap-6">
        <div className="flex min-w-0 items-center justify-start gap-2">
          <MobileNav items={navItems} activeHref={pathname} transparent={lightChrome} />
          <Link
            to={ROUTES.home}
            preload="intent"
            className={cn(
              'font-display text-2xl font-bold uppercase tracking-[-0.04em] transition-colors lg:text-[1.85rem]',
              lightChrome ? 'text-white' : 'text-foreground',
            )}
          >
            {storeName}
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
                <GenderMegaMenu gender="women" transparent={lightChrome} activeHref={pathname} />
              );
            }
            if (item.label === 'Browse') {
              return <MegaMenuPlaceholder transparent={lightChrome} />;
            }
            return undefined;
          }}
        />

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <form
            role="search"
            onSubmit={submitSearch}
            className="hidden w-40 shrink-0 xl:block xl:w-48 2xl:w-56"
          >
            <SearchBar
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search products"
              aria-label="Search products"
              containerClassName={cn(
                '[&_svg]:size-3.5 [&_svg]:stroke-[1.5]',
                lightChrome ? '[&_svg]:text-white/65' : undefined,
              )}
              className={cn(
                'h-9 rounded-none border-0 text-xs tracking-wide shadow-none focus-visible:shadow-[var(--shadow-focus)]',
                lightChrome
                  ? 'focus-visible:bg-white/12 border border-white/30 bg-white/[0.08] text-white placeholder:text-white/50 focus-visible:border-white/45'
                  : 'bg-muted text-foreground placeholder:text-muted-foreground focus-visible:bg-card',
              )}
            />
          </form>

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

            {isAuthed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Account, ${accountLabel}`}
                    className={cn('hidden sm:inline-flex', iconBtn)}
                  >
                    <UserRound />
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
                className={cn('hidden sm:inline-flex', iconBtn)}
              >
                <Link to={ROUTES.authLogin} preload="intent">
                  <UserRound />
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
                <ShoppingBag />
                {cartCount > 0 ? (
                  <span className="bg-accent text-accent-foreground absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-semibold tracking-tight">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </Link>
            </Button>

            <span
              aria-hidden
              className={cn(
                'mx-0.5 hidden h-4 w-px sm:block',
                lightChrome ? 'bg-white/25' : 'bg-border',
              )}
            />

            <div className="hidden sm:block">
              <ThemeToggle className={iconBtn} />
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
