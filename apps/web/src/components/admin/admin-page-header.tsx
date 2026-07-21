import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
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
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
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
  to,
}: {
  title: string;
  value: string | number;
  hint?: string;
  className?: string;
  to?: string;
}) {
  const card = (
    <article
      className={cn(
        'rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 shadow-[var(--admin-shadow)] transition-colors',
        to && 'hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-surface)]',
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </p>
      <p className="mt-3 font-serif text-3xl tabular-nums tracking-tight text-[var(--admin-ink)]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
    </article>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
      >
        {card}
      </Link>
    );
  }

  return card;
}

export function AdminPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] shadow-[var(--admin-shadow)] transition-colors">
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
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
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
