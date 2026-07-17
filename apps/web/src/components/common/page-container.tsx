import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide' | 'full';
}

const sizeClasses: Record<NonNullable<PageContainerProps['size']>, string> = {
  default: 'max-w-7xl',
  narrow: 'max-w-3xl',
  wide: 'max-w-[1600px]',
  full: 'max-w-none',
};

export function PageContainer({ className, size = 'default', ...props }: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}
      {...props}
    />
  );
}
