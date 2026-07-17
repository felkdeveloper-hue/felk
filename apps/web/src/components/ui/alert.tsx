import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3.5 text-sm has-[>svg]:grid-cols-[theme(spacing.5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-5 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground [&>svg]:text-foreground',
        destructive:
          'border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive',
        success: 'border-success/30 bg-success/10 text-success [&>svg]:text-success',
        warning: 'border-warning/40 bg-warning/10 text-warning-foreground [&>svg]:text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}
