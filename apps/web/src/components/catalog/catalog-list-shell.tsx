import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import { CATALOG_BATCH_SIZE, CATALOG_MAX_PRODUCTS, type CatalogSearchState } from '@/utils/catalog';
import type { Product } from '@/services/sdk';
import { CatalogFilterAndSortSheet } from './catalog-filter-sidebar';
import { AppliedFilterChips, type AppliedFilterChip } from './applied-filter-chips';
import { ProductGrid, ProductGridError, ProductGridSkeletonWrapper } from './product-grid';

export interface CatalogListShellProps {
  /** When omitted the shell renders no heading (hero-landing pages handle it externally). */
  title?: string;
  description?: string;
  eyebrow?: string;
  banner?: ReactNode;
  state: CatalogSearchState;
  products: Product[];
  total?: number;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onSearchChange: (patch: Partial<CatalogSearchState>) => void;
  onClearFilters: () => void;
  /** Per-category filter section keys (Bonkers-style). */
  facetKeys?: string[];
}

export function CatalogListShell({
  title,
  description,
  eyebrow,
  banner,
  state,
  products,
  total,
  isLoading,
  isError,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  onRetry,
  onSearchChange,
  onClearFilters,
  facetKeys,
}: CatalogListShellProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Defer facet API fan-out until filters open (or chips need labels).
  // Otherwise 6–7 facet calls queue ahead of the products LIST in the browser.
  const needsFacetLabels = Boolean(
    state.categoryId ||
    state.brandId ||
    state.colorId ||
    state.sizeId ||
    state.materialId ||
    state.occasionId ||
    state.collectionId,
  );
  const facets = useCatalogFilterFacets({
    enabled: filtersOpen || needsFacetLabels,
    includeBrands: Boolean(state.brandId) || filtersOpen,
    includeCollections: Boolean(state.collectionId),
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const chips = useMemo(() => {
    const list: AppliedFilterChip[] = [];
    const add = (key: keyof CatalogSearchState, label: string) => list.push({ key, label });

    if (state.q) add('q', `Search: ${state.q}`);
    // Gender is implicit on category/gender pages — don't surface as a removable chip
    if (state.categoryId) {
      const name = facets.categories.data?.data.find((item) => item.id === state.categoryId)?.name;
      add('categoryId', name ? `Category: ${name}` : 'Category');
    }
    if (state.brandId) {
      const name = facets.brands.data?.data.find((item) => item.id === state.brandId)?.name;
      add('brandId', name ? `Brand: ${name}` : 'Brand');
    }
    if (state.collectionId) add('collectionId', 'Collection');
    if (state.colorId) {
      const name = facets.colors.data?.data.find((item) => item.id === state.colorId)?.name;
      add('colorId', name ? `Color: ${name}` : 'Color');
    }
    if (state.sizeId) {
      const name = facets.sizes.data?.data.find((item) => item.id === state.sizeId)?.name;
      add('sizeId', name ? `Size: ${name}` : 'Size');
    }
    if (state.materialId) {
      const name = facets.materials.data?.data.find((item) => item.id === state.materialId)?.name;
      add('materialId', name ? `Fabric: ${name}` : 'Fabric');
    }
    if (state.occasionId) {
      const name = facets.occasions.data?.data.find((item) => item.id === state.occasionId)?.name;
      add('occasionId', name ? `Occasion: ${name}` : 'Occasion');
    }
    if (state.minPrice != null || state.maxPrice != null) add('minPrice', 'Price range');
    if (state.discountBand) add('discountBand', `Discount: ${state.discountBand}%`);
    if (state.inStock === true) add('inStock', 'In stock');
    if (state.onSale) add('onSale', 'On sale');
    if (state.rating) add('rating', `Rating ${state.rating}+`);
    return list;
  }, [
    facets.brands.data?.data,
    facets.categories.data?.data,
    facets.colors.data?.data,
    facets.materials.data?.data,
    facets.occasions.data?.data,
    facets.sizes.data?.data,
    state,
  ]);

  useEffect(() => {
    if (!onLoadMore || !hasNextPage || isFetchingNextPage || isLoading || !products.length) {
      return;
    }

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      // Prefetch the next page well before the user reaches the end.
      { rootMargin: '900px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, onLoadMore, products.length]);

  // Warm page 2 once the first page is painted (only while still on page 1).
  useEffect(() => {
    if (!onLoadMore || !hasNextPage || isFetchingNextPage || isLoading) return;
    if (products.length === 0 || products.length > CATALOG_BATCH_SIZE) return;
    const timer = window.setTimeout(() => onLoadMore(), 300);
    return () => window.clearTimeout(timer);
  }, [hasNextPage, isFetchingNextPage, isLoading, onLoadMore, products.length]);

  const shown = products.length;
  const catalogTotal = typeof total === 'number' ? total : undefined;
  const cappedTotal =
    catalogTotal != null ? Math.min(catalogTotal, CATALOG_MAX_PRODUCTS) : CATALOG_MAX_PRODUCTS;

  return (
    <div className="pb-24 sm:pb-16 lg:pb-16">
      <Container className="space-y-4 pt-4 sm:space-y-5 sm:pt-6">
        {banner}

        {/* Inline title — only rendered when explicitly passed (e.g. search page) */}
        {title && !banner ? (
          <header className="border-border/50 space-y-1 border-b pb-4 sm:pb-5">
            {eyebrow ? (
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.22em]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-foreground text-xl font-bold uppercase tracking-tight sm:text-2xl">
              {title}
            </h1>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </header>
        ) : null}

        {/* Toolbar — desktop filter trigger + chips | product count */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-3 sm:pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <CatalogFilterAndSortSheet
              state={state}
              onChange={onSearchChange}
              onClear={onClearFilters}
              total={catalogTotal}
              products={products}
              facetKeys={facetKeys}
              onSortChange={(sortBy, sortOrder) => onSearchChange({ sortBy, sortOrder, page: 1 })}
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
            />
            {chips.length > 0 ? (
              <AppliedFilterChips
                chips={chips}
                onRemove={(key) => onSearchChange({ [key]: undefined, page: 1 })}
                onClearAll={onClearFilters}
              />
            ) : null}
          </div>

          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider sm:text-xs">
            {catalogTotal != null ? `${Math.min(catalogTotal, cappedTotal)} products` : null}
          </p>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <ProductGridSkeletonWrapper
            view={state.view}
            filtersOpen={false}
            count={CATALOG_BATCH_SIZE}
          />
        ) : isError ? (
          <ProductGridError onRetry={onRetry} />
        ) : (
          <>
            <ProductGrid products={products} view={state.view} filtersOpen={false} />

            {isFetchingNextPage ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-xs uppercase tracking-widest">
                <span className="bg-foreground/40 size-1.5 animate-pulse rounded-full" />
                Loading more
              </div>
            ) : null}

            {hasNextPage ? (
              <div ref={loadMoreRef} className="h-24 w-full" aria-hidden />
            ) : shown > 0 ? (
              <p className="text-muted-foreground pt-4 text-center text-xs uppercase tracking-widest">
                Showing {shown}
                {catalogTotal != null ? ` of ${Math.min(catalogTotal, cappedTotal)}` : ''} products
              </p>
            ) : null}
          </>
        )}
      </Container>

      {/* Floating filter / sort — below sheets so quick-add covers them */}
      {!filtersOpen ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center gap-2 px-4 lg:hidden"
          style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="border-border/80 bg-background/95 text-foreground pointer-events-auto inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-150 active:scale-[0.97]"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Filter
            {chips.length > 0 ? (
              <span className="bg-foreground text-background flex size-4 items-center justify-center rounded-full text-[9px]">
                {chips.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="border-border/80 bg-background/95 text-foreground pointer-events-auto inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform duration-150 active:scale-[0.97]"
          >
            Sort
          </button>
        </div>
      ) : null}
    </div>
  );
}
