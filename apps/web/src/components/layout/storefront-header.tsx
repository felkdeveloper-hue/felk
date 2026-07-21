import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Heart, LogOut, Search, ShoppingBag, User } from 'lucide-react';
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
  { label: 'Shop', href: ROUTES.products },
  { label: 'Women', href: '/categories/women' },
  { label: 'Men', href: '/categories/men' },
  { label: 'Browse', href: ROUTES.categories },
  { label: 'Contact', href: ROUTES.contact },
];

export interface StorefrontHeaderProps {
  navItems?: NavItem[];
}

export function StorefrontHeader({ navItems = DEFAULT_NAV }: StorefrontHeaderProps) {
  const isScrolled = useScrollHeader({ threshold: 48 });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const isHome = pathname === ROUTES.home;
  const transparent = isHome && !isScrolled;

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
        'sticky top-0 z-50 transition-all duration-300',
        transparent
          ? 'border-transparent bg-transparent text-white'
          : 'glass-panel border-border/60 text-foreground border-b shadow-[var(--shadow-soft)]',
      )}
    >
      <Container className="relative flex h-16 items-center justify-between gap-3 lg:h-[4.75rem] lg:gap-5">
        <div className="flex shrink-0 items-center gap-2">
          <MobileNav items={navItems} activeHref={pathname} transparent={transparent} />
          <Link
            to={ROUTES.home}
            preload="intent"
            className={cn(
              'font-display text-2xl font-bold uppercase tracking-[-0.04em] transition-colors lg:text-[1.85rem]',
              transparent ? 'text-white' : 'text-foreground',
            )}
          >
            {storeName}
          </Link>
        </div>

        <MainNav
          items={navItems}
          activeHref={pathname}
          transparent={transparent}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          renderItem={(item) => {
            if (item.label === 'Women') {
              return (
                <GenderMegaMenu gender="women" transparent={transparent} activeHref={pathname} />
              );
            }
            if (item.label === 'Men') {
              return (
                <GenderMegaMenu gender="men" transparent={transparent} activeHref={pathname} />
              );
            }
            if (item.label === 'Browse') {
              return <MegaMenuPlaceholder transparent={transparent} />;
            }
            return undefined;
          }}
        />

        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <form
            role="search"
            onSubmit={submitSearch}
            className="hidden w-52 md:block lg:w-64 xl:w-72"
          >
            <SearchBar
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search by products"
              aria-label="Search products"
              containerClassName={transparent ? '[&_svg]:text-white/65' : undefined}
              className={cn(
                'h-10 rounded-md border-0 shadow-none focus-visible:shadow-[var(--shadow-focus)]',
                transparent
                  ? 'bg-white/15 text-white placeholder:text-white/55 focus-visible:border-white/35'
                  : 'bg-muted/80 focus-visible:bg-background',
              )}
            />
          </form>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={toggleSearch}
              className={cn(
                'md:hidden',
                transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
              )}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}
              asChild
              className={cn(
                'relative hidden sm:inline-flex',
                transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
              )}
            >
              <Link to={ROUTES.wishlist} preload="intent">
                <Heart />
                {wishlistCount > 0 ? (
                  <span className="size-4.5 bg-accent text-accent-foreground absolute right-1.5 top-1.5 flex items-center justify-center rounded-full text-[10px] font-bold">
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
                    size="sm"
                    className={cn(
                      'hidden gap-2 sm:inline-flex',
                      transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
                    )}
                  >
                    <User className="size-4" aria-hidden />
                    <span className="max-w-28 truncate">{accountLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
                  <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
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
                className={cn(
                  'hidden sm:inline-flex',
                  transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
                )}
              >
                <Link to={ROUTES.authLogin} preload="intent">
                  <User />
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}
              asChild
              className={cn(
                'relative',
                transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
              )}
            >
              <Link to={ROUTES.cart} preload="intent">
                <ShoppingBag />
                {cartCount > 0 ? (
                  <span className="size-4.5 bg-accent text-accent-foreground absolute right-1.5 top-1.5 flex items-center justify-center rounded-full text-[10px] font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            <div className="hidden sm:block">
              <ThemeToggle
                className={
                  transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined
                }
              />
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
