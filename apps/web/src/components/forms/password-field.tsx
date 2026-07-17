import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/input';

export type PasswordFieldProps = Omit<InputProps, 'type'>;

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center outline-none transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);

PasswordField.displayName = 'PasswordField';
