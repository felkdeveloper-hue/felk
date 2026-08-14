import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants';
import type { Product } from '@/services/sdk';
import { useProductSearchSuggestions } from '@/hooks/catalog/use-product-search-suggestions';
import { SearchBar } from '@/components/ui/search-bar';
import { SearchAutocompleteDropdown } from '@/components/search/search-autocomplete-dropdown';

export interface HeaderSearchFieldProps {
  lightChrome?: boolean;
  className?: string;
}

export function HeaderSearchField({ lightChrome, className }: HeaderSearchFieldProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { products, isLoading, debouncedQuery } = useProductSearchSuggestions(query, open);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const goToSearch = (value: string) => {
    const trimmed = value.trim();
    setOpen(false);
    setQuery('');
    const path = trimmed ? `${ROUTES.search}?q=${encodeURIComponent(trimmed)}` : ROUTES.search;
    void navigate({ to: path as typeof ROUTES.search });
  };

  const goToProduct = (product: Product) => {
    setOpen(false);
    setQuery('');
    void navigate({ to: '/products/$slug', params: { slug: product.slug } });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    goToSearch(query);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form role="search" onSubmit={submitSearch}>
        <SearchBar
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClear={() => {
            setQuery('');
            setOpen(false);
          }}
          placeholder="Search products"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          containerClassName={cn(
            '[&_svg]:size-3.5 [&_svg]:stroke-[1.5]',
            lightChrome ? '[&_svg]:text-white/65' : undefined,
          )}
          className={cn(
            'h-9 rounded-none border-0 text-xs tracking-wide shadow-none focus-visible:shadow-[var(--shadow-focus)]',
            lightChrome
              ? 'focus-visible:bg-white/12 border border-white/30 bg-white/[0.08] text-white placeholder:text-white/50 focus-visible:border-white/45'
              : 'bg-muted text-foreground placeholder:text-muted-foreground focus-visible:bg-card',
          )}
        />
      </form>

      {showDropdown ? (
        <SearchAutocompleteDropdown
          query={debouncedQuery || query}
          products={products}
          isLoading={isLoading}
          onSelect={goToProduct}
          onViewAll={() => goToSearch(query)}
          lightChrome={lightChrome}
        />
      ) : null}
    </div>
  );
}
