import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalyticsBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  items: AnalyticsBreadcrumbItem[];
  className?: string;
}

export function AnalyticsBreadcrumbs({ items, className }: Props) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Analytics breadcrumb"
      className={cn('mb-3 flex flex-wrap items-center gap-1 text-sm', className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" /> : null}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  isLast ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
