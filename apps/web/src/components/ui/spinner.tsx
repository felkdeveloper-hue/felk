import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin text-primary', {
  variants: {
    size: {
      sm: 'size-4',
      default: 'size-6',
      lg: 'size-9',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ className, size, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2 className={cn(spinnerVariants({ size }))} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
