import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownWideNarrow, SlidersHorizontal } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import { useUiStore } from '@/store/ui-store';
import { CATALOG_BATCH_SIZE, type CatalogSearchState } from '@/utils/catalog';
import type { Product } from '@/services/sdk';
import { CatalogFilterAndSortSheet } from './catalog-filter-sidebar';
import { CatalogSortSheet } from './catalog-sort-sheet';
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
  /** True while a retry/refetch is in flight — keep skeleton instead of flashing error. */
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onSearchChange: (patch: Partial<CatalogSearchState>) => void;
  onClearFilters: () => void;
  /** Per-category filter section keys (Bonkers-style). */
  facetKeys?: string[];
  /** Custom empty-state copy for category / search PLPs. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
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
  isFetching = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  onRetry,
  onSearchChange,
  onClearFilters,
  facetKeys,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: CatalogListShellProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const catalogFiltersOpenTrigger = useUiStore((s) => s.catalogFiltersOpenTrigger);
  const lastHandledFilterTrigger = useRef(catalogFiltersOpenTrigger);

  // Only open when the trigger increments (Filters tap) — not on mount with a stale value.
  useEffect(() => {
    if (catalogFiltersOpenTrigger > lastHandledFilterTrigger.current) {
      setFiltersOpen(true);
      lastHandledFilterTrigger.current = catalogFiltersOpenTrigger;
    }
  }, [catalogFiltersOpenTrigger]);
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

  const catalogTotal = typeof total === 'number' ? total : undefined;

  return (
    <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 lg:pb-16">
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

        {/* Toolbar — Filter (left) + Sort (right), chips below when applied */}
        <div className="border-border/60 space-y-3 border-b pb-3 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="text-foreground hover:text-foreground/80 inline-flex items-center gap-2 py-1 text-[13px] font-medium tracking-[-0.01em] transition-colors active:opacity-70"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.75} aria-hidden />
              Filter
              {chips.length > 0 ? (
                <span className="bg-foreground text-background flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold">
                  {chips.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Sort products"
              onClick={() => setSortOpen(true)}
              className="border-border text-foreground hover:bg-muted/50 flex size-9 shrink-0 items-center justify-center border transition-colors active:scale-[0.97]"
            >
              <ArrowDownWideNarrow className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          {chips.length > 0 ? (
            <AppliedFilterChips
              chips={chips}
              onRemove={(key) => onSearchChange({ [key]: undefined, page: 1 })}
              onClearAll={onClearFilters}
            />
          ) : null}

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
            showTrigger={false}
          />

          <CatalogSortSheet
            state={state}
            open={sortOpen}
            onOpenChange={setSortOpen}
            onSortChange={(sortBy, sortOrder) => onSearchChange({ sortBy, sortOrder, page: 1 })}
            showTrigger={false}
          />
        </div>

        {/* Product grid — never flash error while retrying or when we already have rows */}
        {isLoading || (isError && isFetching && products.length === 0) ? (
          <ProductGridSkeletonWrapper
            view={state.view}
            filtersOpen={false}
            count={CATALOG_BATCH_SIZE}
          />
        ) : isError && products.length === 0 ? (
          <ProductGridError onRetry={onRetry} />
        ) : (
          <>
            <ProductGrid
              products={products}
              view={state.view}
              filtersOpen={false}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
              emptyAction={emptyAction}
            />

            {isFetchingNextPage ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-xs uppercase tracking-widest">
                <span className="bg-foreground/40 size-1.5 animate-pulse rounded-full" />
                Loading more
              </div>
            ) : null}

            {hasNextPage ? <div ref={loadMoreRef} className="h-24 w-full" aria-hidden /> : null}
          </>
        )}
      </Container>
    </div>
  );
}
