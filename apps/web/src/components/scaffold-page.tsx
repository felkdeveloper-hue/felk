import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScaffoldPageProps {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Shared placeholder shown for routes that exist in the router tree but
 * don't have a real feature implementation yet.
 */
export function ScaffoldPage({ title, description, className, children }: ScaffoldPageProps) {
  return (
    <section
      className={cn(
        'mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Scaffold — not implemented
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
        {title}
      </h1>
      {description ? <p className="mt-3 max-w-lg text-neutral-600">{description}</p> : null}
      {children}
    </section>
  );
}
