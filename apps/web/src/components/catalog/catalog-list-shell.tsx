import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { PaginationControl } from '@/components/ui/pagination';
import { useDisclosure } from '@/hooks';
import { cn } from '@/lib/utils';
import { CatalogFilterSheet, CatalogFilterSidebar } from './catalog-filter-sidebar';
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
  totalPages = 1,
  isLoading,
  isError,
  onRetry,
  onSearchChange,
  onClearFilters,
}: CatalogListShellProps) {
  const facets = useCatalogFilterFacets();
  const { isOpen: filtersOpen, open: openFilters, close: closeFilters } = useDisclosure(true);

  const chips = useMemo(() => {
    const list: AppliedFilterChip[] = [];
    const add = (key: keyof CatalogSearchState, label: string) => list.push({ key, label });

    if (state.q) add('q', `Search: ${state.q}`);
    if (state.gender) add('gender', `Gender: ${state.gender}`);
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
    if (state.discountBand) add('discountBand', `Discount: ${state.discountBand}%`);
    if (state.inStock === true) add('inStock', 'In stock');
    if (state.onSale) add('onSale', 'On sale');
    if (state.rating) add('rating', `Rating ${state.rating}+`);
    return list;
  }, [facets.brands.data?.data, facets.categories.data?.data, state]);

  return (
    <div className="pb-10 sm:pb-14">
      <Container className="pt-10 sm:pt-14">
        {banner}
        <header className="mb-10 space-y-3 text-center">
          {eyebrow ? (
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-foreground text-4xl font-bold uppercase tracking-tight sm:text-6xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground mx-auto max-w-2xl">{description}</p>
          ) : null}
        </header>
      </Container>

      <div
        className={cn(
          'border-border/60 border-t',
          filtersOpen
            ? 'lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]'
            : undefined,
        )}
      >
        {filtersOpen ? (
          <aside className="border-border/60 bg-background hidden self-stretch border-r lg:flex lg:flex-col">
            <div className="sticky top-16 flex max-h-[calc(100vh-4rem)] flex-col lg:top-[4.75rem] lg:max-h-[calc(100vh-4.75rem)]">
              <div className="border-border/60 flex shrink-0 items-center justify-between gap-2 border-b px-5 py-4 xl:px-6">
                <p className="text-foreground text-sm font-bold">Refine By</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Hide filters"
                  onClick={closeFilters}
                >
                  <PanelLeftClose className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 xl:px-6">
                <CatalogFilterSidebar
                  state={state}
                  onChange={onSearchChange}
                  onClear={onClearFilters}
                  hideHeading
                />
              </div>
            </div>
          </aside>
        ) : null}

        <div className="min-w-0">
          <Container className="space-y-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="lg:hidden">
                <CatalogFilterSheet
                  state={state}
                  onChange={onSearchChange}
                  onClear={onClearFilters}
                />
              </div>
              {!filtersOpen ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  aria-label="Show filters"
                  onClick={openFilters}
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              ) : null}
              <AppliedFilterChips
                chips={chips}
                onRemove={(key) => onSearchChange({ [key]: undefined, page: 1 })}
                onClearAll={onClearFilters}
              />
            </div>

            {isLoading ? (
              <ProductGridSkeletonWrapper view={state.view} />
            ) : isError ? (
              <ProductGridError onRetry={onRetry} />
            ) : (
              <ProductGrid products={products} view={state.view} filtersOpen={filtersOpen} />
            )}

            <PaginationControl
              page={state.page ?? 1}
              totalPages={totalPages}
              onPageChange={(page) => onSearchChange({ page })}
            />
          </Container>
        </div>
      </div>
    </div>
  );
}
