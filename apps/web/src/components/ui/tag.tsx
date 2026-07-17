import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const tagVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground',
        accent: 'border-transparent bg-accent text-accent-foreground',
        outline: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface TagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onClick'>, VariantProps<typeof tagVariants> {
  onRemove?: () => void;
}

export function Tag({ className, variant, onRemove, children, ...props }: TagProps) {
  return (
    <span data-slot="tag" className={cn(tagVariants({ variant }), className)} {...props}>
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-current/70 hover:bg-foreground/10 focus-visible:ring-ring/40 -mr-1 rounded-full p-0.5 outline-none transition-colors hover:text-current focus-visible:ring-2"
          aria-label="Remove"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
