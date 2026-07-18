import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProductSkeletonProps {
  className?: string;
}

export function ProductSkeleton({ className }: ProductSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export function ProductGridSkeleton({ count = 8, className }: ProductGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4', className)}>
      {Array.from({ length: count }, (_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
}
