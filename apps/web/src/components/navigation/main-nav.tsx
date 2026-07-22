import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  megaMenu?: boolean;
  /** When set, active state matches `/products?gender=<value>` instead of pathname equality. */
  gender?: 'men' | 'women';
}

export interface MainNavProps {
  items: NavItem[];
  activeHref?: string;
  transparent?: boolean;
  className?: string;
  /** Return a custom node for an item; return undefined to use the default link. */
  renderItem?: (item: NavItem) => ReactNode | undefined;
}

export function MainNav({ items, activeHref, transparent, className, renderItem }: MainNavProps) {
  return (
    <nav aria-label="Main" className={cn('hidden items-center gap-7 lg:flex', className)}>
      {items.map((item) => {
        const custom = renderItem?.(item);
        if (custom !== undefined) {
          return <span key={item.label}>{custom}</span>;
        }

        const isActive = activeHref === item.href;

        return (
          <Link
            key={item.label}
            to={item.href}
            preload="intent"
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative text-sm font-semibold tracking-wide transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100',
              transparent
                ? 'text-white/85 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
              isActive &&
                (transparent
                  ? 'text-white after:scale-x-100'
                  : 'text-foreground after:scale-x-100'),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
