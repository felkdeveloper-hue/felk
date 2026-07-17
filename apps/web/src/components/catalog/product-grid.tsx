import type { Product } from '@/services/sdk';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

export interface ProductGridProps {
  products: Product[];
  view?: 'grid' | 'list';
  className?: string;
}

export function ProductGrid({ products, view = 'grid', className }: ProductGridProps) {
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
          ? 'grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6'
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

export function ProductGridSkeletonWrapper({ view = 'grid' }: { view?: 'grid' | 'list' }) {
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
