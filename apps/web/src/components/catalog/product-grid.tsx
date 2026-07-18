import type { Product } from '@/services/sdk';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

export interface ProductGridProps {
  products: Product[];
  view?: 'grid' | 'list';
  /** When true, cap the grid at 4 columns so cards stay larger beside the sidebar. */
  filtersOpen?: boolean;
  className?: string;
}

export function ProductGrid({
  products,
  view = 'grid',
  filtersOpen = false,
  className,
}: ProductGridProps) {
  if (!products.length) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your filters or search terms."
      />
    );
  }

  return (
    <div
      data-virtual-ready
      className={cn(
        view === 'grid'
          ? filtersOpen
            ? 'grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4'
            : 'grid grid-cols-2 gap-5 sm:gap-7 md:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col gap-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} layout={view} />
      ))}
    </div>
  );
}

export function ProductGridSkeletonWrapper({
  view = 'grid',
}: {
  view?: 'grid' | 'list';
  filtersOpen?: boolean;
}) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <ProductGridSkeleton key={index} count={1} className="grid-cols-1" />
        ))}
      </div>
    );
  }
  return <ProductGridSkeleton count={8} />;
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
