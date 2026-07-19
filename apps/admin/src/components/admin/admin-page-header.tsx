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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--admin-line)] pb-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-accent)]">
          FE Admin
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-[var(--admin-ink)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">{description}</p>
        ) : null}
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
      className={cn(
        'rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 shadow-[0_1px_0_rgba(12,13,16,0.03)]',
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-3 font-serif text-3xl tracking-tight text-[var(--admin-ink)]">{value}</p>
      {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
    </article>
  );
}

export function AdminPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] shadow-[0_1px_0_rgba(12,13,16,0.03)]">
      {title ? (
        <header className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h2>
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--admin-line)] bg-[var(--admin-panel)] px-8 py-12 text-center">
      <h3 className="font-serif text-2xl text-[var(--admin-ink)]">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-5 text-sm text-red-800">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium underline underline-offset-2"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
