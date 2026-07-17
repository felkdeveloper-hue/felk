import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      'w-10.5 peer inline-flex h-6 shrink-0 items-center rounded-full border border-transparent shadow-[var(--shadow-soft)] outline-none transition-colors',
      'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'bg-card pointer-events-none block size-5 rounded-full shadow ring-0 transition-transform',
        'data-[state=checked]:translate-x-[19px] data-[state=unchecked]:translate-x-0.5',
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;
