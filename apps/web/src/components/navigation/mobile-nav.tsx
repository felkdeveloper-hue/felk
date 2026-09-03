import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Heart, Menu, Search, User, X } from 'lucide-react';
import { ROUTES } from '@/constants';
import { HOME_CATEGORY_NAV_ITEMS } from '@/constants/home-category-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/components/navigation/main-nav';
import { useAuthStore } from '@/store';
import { useUiStore } from '@/store/ui-store';

export interface MobileNavProps {
  items: NavItem[];
  activeHref?: string;
  transparent?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type MobileTab = 'menu' | 'categories';

/** CATEGORIES tab — same labels/slugs as homepage Categories grid. */
const CATEGORY_ITEMS = HOME_CATEGORY_NAV_ITEMS.map(({ label, slug }) => ({ label, slug }));

const rowClass =
  'text-foreground flex min-h-[3.25rem] w-full items-center border-b border-border/70 px-4 text-[13px] font-medium uppercase tracking-[0.08em] transition-opacity duration-150 active:opacity-60';

/**
 * Mobile drawer — search + MENU / CATEGORIES tabs (reference IMAGE 2 & 3).
 * Desktop mega menu is unchanged; this component is lg:hidden only.
 */
export function MobileNav({ items: _items, transparent, open, onOpenChange }: MobileNavProps) {
  const [tab, setTab] = useState<MobileTab>('menu');
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);

  // Reset to MENU whenever the drawer is reopened.
  useEffect(() => {
    if (open) setTab('menu');
  }, [open]);

  const close = () => onOpenChange?.(false);

  const openSearch = () => {
    close();
    // Reuse existing FloatingSearch overlay (same as navbar search icon).
    window.setTimeout(() => setSearchOpen(true), 180);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center transition-opacity duration-150 active:opacity-70 lg:hidden',
            transparent ? 'text-white' : 'text-foreground',
          )}
        >
          <Menu className="size-[22px]" strokeWidth={1.5} aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showClose={false}
        className="bg-background border-border/60 z-[110] flex h-dvh w-[86%] max-w-[22rem] flex-col gap-0 border-r p-0 sm:max-w-[22rem]"
        overlayClassName="bg-black/45 z-[105]"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>

        {/* Search — opens existing FloatingSearch */}
        <div className="border-border/70 flex items-center gap-1 border-b bg-[#f3f3f3] px-2.5 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={openSearch}
            className="border-border/50 bg-background text-muted-foreground flex h-10 min-w-0 flex-1 items-center gap-2 border px-3 text-left text-[13px]"
            aria-label="Search for products"
          >
            <span className="min-w-0 flex-1 truncate">Search for products</span>
            <Search className="text-foreground/70 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            className="text-foreground/70 size-10 shrink-0"
            onClick={close}
          >
            <X className="size-4" strokeWidth={1.75} />
          </Button>
        </div>

        {/* MENU / CATEGORIES tabs */}
        <div
          role="tablist"
          aria-label="Navigation sections"
          className="border-border/70 grid grid-cols-2 border-b bg-[#ececec]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'menu'}
            onClick={() => setTab('menu')}
            className={cn(
              'relative min-h-11 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors',
              tab === 'menu'
                ? 'text-foreground after:bg-foreground bg-[#e4e4e4] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5'
                : 'text-foreground/55 bg-[#ececec]',
            )}
          >
            Menu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'categories'}
            onClick={() => setTab('categories')}
            className={cn(
              'border-border/60 relative min-h-11 border-l text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors',
              tab === 'categories'
                ? 'text-foreground after:bg-foreground bg-[#e4e4e4] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5'
                : 'text-foreground/55 bg-[#ececec]',
            )}
          >
            Categories
          </button>
        </div>

        <nav
          aria-label={tab === 'menu' ? 'Menu' : 'Categories'}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          {tab === 'menu' ? (
            <ul>
              <li>
                <Link to={ROUTES.home} preload="intent" onClick={close} className={rowClass}>
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.products}
                  search={{ gender: 'women' }}
                  preload="intent"
                  onClick={close}
                  className={cn(rowClass, 'justify-between gap-3 pr-3')}
                >
                  All Products
                  <span
                    className="border-border/80 text-foreground/70 inline-flex size-7 shrink-0 items-center justify-center border"
                    aria-hidden
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2} />
                  </span>
                </Link>
              </li>
              <li>
                <Link to={ROUTES.about} preload="intent" onClick={close} className={rowClass}>
                  About
                </Link>
              </li>
              <li>
                <Link to={ROUTES.contact} preload="intent" onClick={close} className={rowClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.wishlist}
                  preload="intent"
                  onClick={close}
                  className={cn(rowClass, 'gap-2.5')}
                >
                  <Heart className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Wishlist
                </Link>
              </li>
              <li>
                {isAuthed ? (
                  <Link
                    to={ROUTES.account}
                    preload="intent"
                    onClick={close}
                    className={cn(rowClass, 'gap-2.5')}
                  >
                    <User className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    My Account
                  </Link>
                ) : (
                  <Link
                    to={ROUTES.authLogin}
                    preload="intent"
                    onClick={close}
                    className={cn(rowClass, 'gap-2.5')}
                  >
                    <User className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    Login / Register
                  </Link>
                )}
              </li>
            </ul>
          ) : (
            <ul>
              {CATEGORY_ITEMS.map((item) => (
                <li key={item.slug}>
                  <Link
                    to="/categories/$slug"
                    params={{ slug: item.slug }}
                    preload="intent"
                    onClick={close}
                    className={rowClass}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
