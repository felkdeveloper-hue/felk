import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface ProductSkeletonProps {
  className?: string;
}

export function ProductSkeleton({ className }: ProductSkeletonProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <Skeleton className="aspect-[3/4] w-full rounded-t-2xl" />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="size-7 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-3/4 rounded-md" />
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
