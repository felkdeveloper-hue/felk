import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export function CardSkeleton({ className, lines = 2 }: CardSkeletonProps) {
  return (
    <div className={cn('border-border bg-card space-y-4 rounded-xl border p-5', className)}>
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}
