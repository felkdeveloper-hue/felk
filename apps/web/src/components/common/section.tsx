import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: ElementType;
  spacing?: 'none' | 'sm' | 'default' | 'lg';
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
}

const spacingClasses: Record<NonNullable<SectionProps['spacing']>, string> = {
  none: '',
  sm: 'py-8 sm:py-10',
  default: 'py-14 sm:py-20 lg:py-24',
  lg: 'py-20 sm:py-28 lg:py-32',
};

export function Section({
  as: Component = 'section',
  spacing = 'default',
  title,
  description,
  eyebrow,
  action,
  className,
  children,
  ...props
}: SectionProps) {
  const hasHeader = Boolean(title || description || eyebrow || action);

  return (
    <Component data-slot="section" className={cn(spacingClasses[spacing], className)} {...props}>
      {hasHeader ? (
        <div className="mx-auto mb-8 flex w-full flex-col gap-4 px-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-display text-foreground max-w-3xl text-3xl font-bold uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </Component>
  );
}
