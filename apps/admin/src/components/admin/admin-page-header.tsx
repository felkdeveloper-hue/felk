import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminStatCard({
  title,
  value,
  hint,
  className,
}: {
  title: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <article
      className={cn('rounded-xl border border-neutral-200 bg-white p-5 shadow-sm', className)}
    >
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </article>
  );
}

export function AdminPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      {title ? (
        <header className="border-b border-neutral-200 px-5 py-4">
          <h2 className="font-medium text-neutral-900">{title}</h2>
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
      <h3 className="font-medium text-neutral-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-neutral-500">{description}</p> : null}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="mt-3 underline" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
