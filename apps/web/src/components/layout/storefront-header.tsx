import { Link, useRouterState } from '@tanstack/react-router';
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
  const isHome = pathname === ROUTES.home;
  const transparent = isHome && !isScrolled;

  const { data: settings } = usePublicSettings();
  const storeName =
    getSetting<string>(settings, 'store.name') ?? getSetting<string>(settings, 'storeName') ?? 'FE';

  const cartCount = useCartStore(selectCartItemCount);
  const toggleSearch = useUiStore((state) => state.toggleSearch);
  const toggleCartDrawer = useUiStore((state) => state.toggleCartDrawer);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { data: wishlistCount = 0 } = useWishlistItemCountQuery();

  const accountLabel = user?.firstName ?? user?.email?.split('@')[0] ?? 'Account';

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
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[4.75rem]">
        <div className="flex items-center gap-2">
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
          renderItem={(item) =>
            item.label === 'Browse' ? <MegaMenuPlaceholder transparent={transparent} /> : undefined
          }
        />

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={toggleSearch}
            className={cn(
              'hidden sm:inline-flex',
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
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.account}>Account overview</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.accountProfile}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.orders}>Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
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
            onClick={toggleCartDrawer}
            className={cn(
              'relative',
              transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined,
            )}
          >
            <ShoppingBag />
            {cartCount > 0 ? (
              <span className="size-4.5 bg-accent text-accent-foreground absolute right-1.5 top-1.5 flex items-center justify-center rounded-full text-[10px] font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            ) : null}
          </Button>
          <div className="hidden sm:block">
            <ThemeToggle
              className={transparent ? 'text-white hover:bg-white/10 hover:text-white' : undefined}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}
