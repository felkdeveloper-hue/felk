import { Link } from '@tanstack/react-router';
import { ShoppingBag, Menu, Search, User } from 'lucide-react';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { useCartStore, selectCartItemCount, useUiStore } from '@/store';

const NAV_LINKS = [
  { label: 'Shop', to: ROUTES.products },
  { label: 'Women', to: '/categories/women' },
  { label: 'Men', to: '/categories/men' },
  { label: 'Browse', to: ROUTES.categories },
  { label: 'Contact', to: ROUTES.contact },
];

/**
 * Minimal storefront header. Intentionally lightweight — feature teams will
 * replace this with the full design-system header as pages come online.
 */
export function Header() {
  const itemCount = useCartStore(selectCartItemCount);
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);
  const toggleSearch = useUiStore((state) => state.toggleSearch);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 md:hidden"
          onClick={toggleMobileNav}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={ROUTES.home} className="text-lg font-semibold tracking-tight">
          FE Platform
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900',
              )}
              activeProps={{ className: 'text-neutral-900' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSearch}
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to={ROUTES.account}
            aria-label="Account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to={ROUTES.cart}
            aria-label="Cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 ? (
              <span className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
