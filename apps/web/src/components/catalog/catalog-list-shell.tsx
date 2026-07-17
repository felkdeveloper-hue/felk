import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Container } from '@/components/layout/container';
import { PaginationControl } from '@/components/ui/pagination';
import { CatalogFilterSheet, CatalogFilterSidebar } from './catalog-filter-sidebar';
import { CatalogToolbar } from './catalog-toolbar';
import { AppliedFilterChips, type AppliedFilterChip } from './applied-filter-chips';
import { ProductGrid, ProductGridError, ProductGridSkeletonWrapper } from './product-grid';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import type { CatalogSearchState } from '@/utils/catalog';
import type { Product } from '@/services/sdk';

export interface CatalogListShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  banner?: ReactNode;
  state: CatalogSearchState;
  products: Product[];
  total?: number;
  totalPages?: number;
  isLoading: boolean;
  isError: boolean;
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
  totalPages = 1,
  isLoading,
  isError,
  onRetry,
  onSearchChange,
  onClearFilters,
}: CatalogListShellProps) {
  const facets = useCatalogFilterFacets();

  const chips = useMemo(() => {
    const list: AppliedFilterChip[] = [];
    const add = (key: keyof CatalogSearchState, label: string) => list.push({ key, label });

    if (state.q) add('q', `Search: ${state.q}`);
    if (state.categoryId) {
      const name = facets.categories.data?.data.find((item) => item.id === state.categoryId)?.name;
      add('categoryId', name ? `Category: ${name}` : 'Category');
    }
    if (state.brandId) {
      const name = facets.brands.data?.data.find((item) => item.id === state.brandId)?.name;
      add('brandId', name ? `Brand: ${name}` : 'Brand');
    }
    if (state.collectionId) add('collectionId', 'Collection');
    if (state.colorId) add('colorId', 'Color');
    if (state.sizeId) add('sizeId', 'Size');
    if (state.materialId) add('materialId', 'Material');
    if (state.occasionId) add('occasionId', 'Occasion');
    if (state.minPrice != null || state.maxPrice != null) add('minPrice', 'Price range');
    if (state.inStock === true) add('inStock', 'In stock');
    if (state.onSale) add('onSale', 'On sale');
    if (state.rating) add('rating', `Rating ${state.rating}+`);
    return list;
  }, [facets.brands.data?.data, facets.categories.data?.data, state]);

  return (
    <Container className="py-10 sm:py-14">
      {banner}
      <header className="mb-10 space-y-3">
        {eyebrow ? (
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-foreground text-4xl font-bold uppercase tracking-tight sm:text-6xl">
          {title}
        </h1>
        {description ? <p className="text-muted-foreground max-w-2xl">{description}</p> : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:gap-10">
        <div className="hidden lg:block">
          <div className="border-border/70 bg-card/80 sticky top-28 rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            <CatalogFilterSidebar
              state={state}
              onChange={onSearchChange}
              onClear={onClearFilters}
            />
          </div>
        </div>

        <div className="space-y-6">
          <CatalogToolbar
            state={state}
            total={total}
            filterTrigger={
              <div className="lg:hidden">
                <CatalogFilterSheet
                  state={state}
                  onChange={onSearchChange}
                  onClear={onClearFilters}
                />
              </div>
            }
            onSortChange={(sortBy, sortOrder) => onSearchChange({ sortBy, sortOrder })}
            onViewChange={(view) => onSearchChange({ view })}
          />

          <AppliedFilterChips
            chips={chips}
            onRemove={(key) => onSearchChange({ [key]: undefined, page: 1 })}
            onClearAll={onClearFilters}
          />

          {isLoading ? (
            <ProductGridSkeletonWrapper view={state.view} />
          ) : isError ? (
            <ProductGridError onRetry={onRetry} />
          ) : (
            <ProductGrid products={products} view={state.view} />
          )}

          <PaginationControl
            page={state.page ?? 1}
            totalPages={totalPages}
            onPageChange={(page) => onSearchChange({ page })}
          />
        </div>
      </div>
    </Container>
  );
}
