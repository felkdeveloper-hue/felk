import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="container"
      className={cn(
        'mx-auto w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20',
        className,
      )}
      {...props}
    />
  );
}
