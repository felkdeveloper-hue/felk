import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

interface Props {
  children: ReactNode;
  onDrill: () => void;
  className?: string;
  /** Accessible / tooltip label */
  label?: string;
  disabled?: boolean;
  as?: 'button' | 'div';
}

/** Makes any analytics widget clickable with consistent UX. */
export function Drillable({
  children,
  onDrill,
  className,
  label = DRILL_TOOLTIP,
  disabled,
  as = 'button',
}: Props) {
  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDrill();
    }
  };

  if (as === 'div') {
    return (
      <div
        role="button"
        tabIndex={0}
        title={label}
        aria-label={label}
        onClick={onDrill}
        onKeyDown={onKeyDown}
        className={cn(
          'cursor-pointer rounded-xl outline-none transition-colors',
          'hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-primary/40 focus-visible:ring-2',
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onDrill}
      className={cn(
        'cursor-pointer rounded-xl text-left outline-none transition-colors',
        'hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-primary/40 focus-visible:ring-2',
        'w-full border-0 bg-transparent p-0',
        className,
      )}
    >
      {children}
    </button>
  );
}
