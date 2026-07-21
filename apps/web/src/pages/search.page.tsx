import { useCallback, useEffect, useMemo, useState } from 'react';
import { Seo } from '@/components/common/seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CatalogListShell } from '@/components/catalog';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCatalogSearchParams, useInfiniteProducts, useSearchExperience } from '@/hooks/catalog';
import { CATALOG_MAX_PRODUCTS } from '@/utils/catalog';

export function SearchPage() {
  const { state, setSearch, clearFilters } = useCatalogSearchParams();
  const [input, setInput] = useState(state.q ?? '');
  const search = useSearchExperience(input);
  const query = useInfiniteProducts({ ...state, q: search.debouncedQuery || state.q });

  const products = useMemo(() => {
    const flat = query.data?.pages.flatMap((page) => page.data) ?? [];
    return flat.slice(0, CATALOG_MAX_PRODUCTS);
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.meta.total;
  const hasNextPage = Boolean(query.hasNextPage) && products.length < CATALOG_MAX_PRODUCTS;

  const onLoadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  useEffect(() => {
    setInput(state.q ?? '');
  }, [state.q]);

  useEffect(() => {
    if (!search.debouncedQuery) return;
    setSearch({ q: search.debouncedQuery }, { replace: true });
  }, [search.debouncedQuery, setSearch]);

  const submit = (term: string) => {
    const normalized = term.trim();
    setInput(normalized);
    search.rememberSearch(normalized);
    setSearch({ q: normalized || undefined, page: 1 });
  };

  return (
    <>
      <Seo
        title={state.q ? `Search: ${state.q}` : 'Search'}
        description={`Search the ${siteConfig.name} catalog.`}
        url={buildAbsoluteUrl('/search')}
        noIndex
      />

      <div className="border-border from-muted/70 to-background border-b bg-gradient-to-b">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            Discover
          </p>
          <h1 className="font-display mb-6 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Search
          </h1>
          <label htmlFor="catalog-search" className="sr-only">
            Search products
          </label>
          <div className="flex gap-2">
            <Input
              id="catalog-search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit(input);
              }}
              placeholder="Search products, brands, categories…"
              autoComplete="off"
              className="h-12 rounded-full"
            />
            <Button type="button" className="h-12 px-6" onClick={() => submit(input)}>
              Search
            </Button>
          </div>

          {search.suggestions.length ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Search suggestions">
              {search.suggestions.map((term) => (
                <li key={term}>
                  <Button type="button" size="sm" variant="outline" onClick={() => submit(term)}>
                    {term}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {!input && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Recent searches</p>
                <div className="flex flex-wrap gap-2">
                  {search.recentSearches.length ? (
                    search.recentSearches.map((term) => (
                      <Button
                        key={term}
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => submit(term)}
                      >
                        {term}
                      </Button>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent searches yet.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {search.popularSearches.map((term) => (
                    <Button
                      key={term}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => submit(term)}
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CatalogListShell
        title={state.q ? `Results for “${state.q}”` : 'Search products'}
        description={total != null ? `${total} result${total === 1 ? '' : 's'}` : undefined}
        state={state}
        products={products}
        total={total}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPage={hasNextPage}
        onLoadMore={onLoadMore}
        onRetry={() => void query.refetch()}
        onSearchChange={setSearch}
        onClearFilters={clearFilters}
      />
    </>
  );
}
