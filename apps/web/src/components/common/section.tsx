import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: ElementType;
  spacing?: 'none' | 'sm' | 'default' | 'lg';
  title?: ReactNode;
  /** @deprecated Unused — section headers are title-only. */
  description?: ReactNode;
  /** @deprecated Unused — section headers are title-only. */
  eyebrow?: ReactNode;
  action?: ReactNode;
  /** Centered title matching the Categories homepage style. */
  titleAlign?: 'start' | 'center';
}

const spacingClasses: Record<NonNullable<SectionProps['spacing']>, string> = {
  none: '',
  sm: 'py-3 sm:py-4',
  default: 'py-4 sm:py-5 lg:py-6',
  lg: 'py-8 sm:py-10 lg:py-12',
};

export function Section({
  as: Component = 'section',
  spacing = 'default',
  title,
  description: _description,
  eyebrow: _eyebrow,
  action,
  titleAlign = 'start',
  className,
  children,
  ...props
}: SectionProps) {
  const hasHeader = Boolean(title || action);
  const centered = titleAlign === 'center';

  return (
    <Component data-slot="section" className={cn(spacingClasses[spacing], className)} {...props}>
      {hasHeader ? (
        centered ? (
          <div className="relative mx-auto mb-5 max-w-[1680px] px-4 text-center sm:mb-6 sm:px-6 lg:px-8 xl:px-10">
            {title ? (
              <h2 className="font-display text-foreground text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl lg:text-4xl">
                {title}
              </h2>
            ) : null}
            {action ? (
              <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:right-6 sm:block lg:right-8 xl:right-10">
                {action}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto mb-3 flex w-full flex-col gap-1.5 px-4 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:px-5 lg:px-6">
            {title ? (
              <h2 className="font-display text-foreground max-w-3xl text-3xl font-bold uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        )
      ) : null}
      {children}
    </Component>
  );
}
