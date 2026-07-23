import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
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
}: CatalogListShellProps) {
  const facets = useCatalogFilterFacets();
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
      add('materialId', name ? `Material: ${name}` : 'Material');
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
    if (!onLoadMore || !hasNextPage || isFetchingNextPage || isLoading) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, onLoadMore, products.length]);

  const shown = products.length;
  const catalogTotal = typeof total === 'number' ? total : undefined;
  const cappedTotal =
    catalogTotal != null ? Math.min(catalogTotal, CATALOG_MAX_PRODUCTS) : CATALOG_MAX_PRODUCTS;

  return (
    <div className="pb-12 sm:pb-16">
      <Container className="space-y-5 pt-5 sm:pt-6">
        {banner}

        {/* Inline title — only rendered when explicitly passed (e.g. search page) */}
        {title && !banner ? (
          <header className="border-border/50 space-y-1 border-b pb-5">
            {eyebrow ? (
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.22em]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-foreground text-2xl font-bold uppercase tracking-tight">
              {title}
            </h1>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </header>
        ) : null}

        {/* Toolbar — Filter+Sort sheet | product count */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-4">
            <CatalogFilterAndSortSheet
              state={state}
              onChange={onSearchChange}
              onClear={onClearFilters}
              total={catalogTotal}
              onSortChange={(sortBy, sortOrder) => onSearchChange({ sortBy, sortOrder, page: 1 })}
            />
            {chips.length > 0 ? (
              <AppliedFilterChips
                chips={chips}
                onRemove={(key) => onSearchChange({ [key]: undefined, page: 1 })}
                onClearAll={onClearFilters}
              />
            ) : null}
          </div>

          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
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
              <ProductGridSkeletonWrapper
                view={state.view}
                filtersOpen={false}
                count={Math.min(CATALOG_BATCH_SIZE, Math.max(cappedTotal - shown, 4))}
              />
            ) : null}

            {hasNextPage ? (
              <div ref={loadMoreRef} className="h-8 w-full" aria-hidden />
            ) : shown > 0 ? (
              <p className="text-muted-foreground pt-4 text-center text-xs uppercase tracking-widest">
                Showing {shown}
                {catalogTotal != null ? ` of ${Math.min(catalogTotal, cappedTotal)}` : ''} products
              </p>
            ) : null}
          </>
        )}
      </Container>
    </div>
  );
}
