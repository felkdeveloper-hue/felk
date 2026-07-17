import * as React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('skeleton-shimmer bg-muted rounded-2xl', className)}
      {...props}
    />
  );
}
