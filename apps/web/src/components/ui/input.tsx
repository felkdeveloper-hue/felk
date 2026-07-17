import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        aria-invalid={invalid || props['aria-invalid']}
        className={cn(
          'border-input bg-card text-foreground selection:bg-primary/20 flex h-10 w-full min-w-0 rounded-md border px-3.5 py-2 text-sm shadow-[var(--shadow-soft)] outline-none transition-[color,box-shadow,border-color]',
          'placeholder:text-muted-foreground/70',
          'file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'focus-visible:border-ring focus-visible:shadow-[var(--shadow-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_hsl(var(--destructive)/0.2)]',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
