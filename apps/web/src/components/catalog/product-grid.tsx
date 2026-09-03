import type { ReactNode } from 'react';
import type { Product } from '@/services/sdk';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';
import { CATALOG_BATCH_SIZE } from '@/utils/catalog';
import { ProductCard } from './product-card';

export interface ProductGridProps {
  products: Product[];
  view?: 'grid' | 'list';
  /** When true, cap the grid at 4 columns so cards stay larger beside the sidebar. */
  filtersOpen?: boolean;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

function gridClassName(view: 'grid' | 'list', filtersOpen: boolean) {
  if (view === 'list') return 'flex flex-col gap-3 sm:gap-4';
  return filtersOpen
    ? 'grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4'
    : 'grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-7 md:grid-cols-3 xl:grid-cols-4';
}

export function ProductGrid({
  products,
  view = 'grid',
  filtersOpen = false,
  className,
  emptyTitle = 'No products found',
  emptyDescription = 'Try adjusting your filters or search terms.',
  emptyAction,
}: ProductGridProps) {
  if (!products.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div data-virtual-ready className={cn(gridClassName(view, filtersOpen), className)}>
      {products.map((product, index) => (
        <ProductCard
          key={`${product.id}-${product.defaultVariantId ?? 'default'}`}
          product={product}
          layout={view}
          priority={index < 8}
        />
      ))}
    </div>
  );
}

export function ProductGridSkeletonWrapper({
  view = 'grid',
  filtersOpen = false,
  count = CATALOG_BATCH_SIZE,
}: {
  view?: 'grid' | 'list';
  filtersOpen?: boolean;
  count?: number;
}) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: Math.min(count, 6) }, (_, index) => (
          <ProductGridSkeleton key={index} count={1} className="grid-cols-1" />
        ))}
      </div>
    );
  }

  return <ProductGridSkeleton count={count} className={cn(gridClassName('grid', filtersOpen))} />;
}

export function ProductGridError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Unable to load products"
      description="We couldn't fetch the catalog right now."
      onRetry={onRetry}
    />
  );
}
