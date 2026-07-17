import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  megaMenu?: boolean;
}

export interface MainNavProps {
  items: NavItem[];
  activeHref?: string;
  transparent?: boolean;
  className?: string;
}

export function MainNav({ items, activeHref, transparent, className }: MainNavProps) {
  return (
    <nav aria-label="Main" className={cn('hidden items-center gap-7 lg:flex', className)}>
      {items.map((item) => {
        const isActive = activeHref === item.href;

        return (
          <Link
            key={item.href}
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
