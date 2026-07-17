import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
  onClear?: () => void;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, containerClassName, value, onClear, ...props }, ref) => {
    const hasValue = typeof value === 'string' ? value.length > 0 : Boolean(value);

    return (
      <div
        data-slot="search-bar"
        className={cn('relative flex w-full items-center', containerClassName)}
      >
        <Search className="text-muted-foreground pointer-events-none absolute left-3.5 size-4" />
        <Input
          ref={ref}
          type="search"
          value={value}
          className={cn('px-9 [&::-webkit-search-cancel-button]:hidden', className)}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/40 absolute right-3 rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';
