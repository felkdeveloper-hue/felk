import { Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { MainNav, type NavItem } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { Container } from '@/components/layout/container';

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: 'New Arrivals', href: '/shop?filter=new' },
  { label: 'Shop', href: '/shop' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'About', href: '/about' },
];

export interface SiteHeaderProps {
  items?: NavItem[];
  activeHref?: string;
  cartCount?: number;
  onSearchClick?: () => void;
  onAccountClick?: () => void;
  onCartClick?: () => void;
  className?: string;
}

export function SiteHeader({
  items = DEFAULT_NAV_ITEMS,
  activeHref,
  cartCount = 0,
  onSearchClick,
  onAccountClick,
  onCartClick,
  className,
}: SiteHeaderProps) {
  return (
    <header
      data-slot="site-header"
      className={cn(
        'border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md',
        className,
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileNav items={items} activeHref={activeHref} />
          <a href="/" className="font-display text-foreground text-2xl tracking-tight">
            FE
          </a>
        </div>

        <MainNav items={items} activeHref={activeHref} />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={onSearchClick}>
            <Search />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Account" onClick={onAccountClick}>
            <User />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cart"
            className="relative"
            onClick={onCartClick}
          >
            <ShoppingBag />
            {cartCount > 0 ? (
              <span className="size-4.5 bg-primary text-primary-foreground absolute right-1 top-1 flex items-center justify-center rounded-full text-[10px] font-semibold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            ) : null}
          </Button>
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
