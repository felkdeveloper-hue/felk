import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-wide transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90 hover:shadow-[var(--shadow-elevated)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[var(--shadow-soft)] hover:bg-destructive/90',
        outline:
          'border border-border bg-card/80 hover:border-foreground hover:bg-foreground hover:text-background',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'rounded-none text-foreground underline-offset-4 hover:underline',
        accent: 'bg-accent text-accent-foreground shadow-[var(--shadow-soft)] hover:bg-accent/90',
      },
      size: {
        default: 'h-11 px-6 py-2 has-[>svg]:px-5',
        sm: 'h-9 px-4 text-[13px] has-[>svg]:px-3.5',
        lg: 'h-12 px-8 text-base has-[>svg]:px-7',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot
          ref={ref}
          data-slot="button"
          className={classes}
          aria-busy={loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        data-slot="button"
        className={classes}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
