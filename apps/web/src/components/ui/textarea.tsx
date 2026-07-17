import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        aria-invalid={invalid || props['aria-invalid']}
        className={cn(
          'border-input bg-card text-foreground selection:bg-primary/20 flex min-h-24 w-full rounded-md border px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)] outline-none transition-[color,box-shadow,border-color]',
          'placeholder:text-muted-foreground/70',
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

Textarea.displayName = 'Textarea';
