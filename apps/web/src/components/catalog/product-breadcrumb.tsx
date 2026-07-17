import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  params?: Record<string, string>;
}

export interface ProductBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function ProductBreadcrumb({ items, className }: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-muted-foreground text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  params={item.params as never}
                  preload="intent"
                  className="hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-foreground' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="size-4" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
