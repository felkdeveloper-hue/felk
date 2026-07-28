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
    <div className="mb-5 flex flex-col gap-4 border-b border-[var(--admin-line)] pb-4 sm:mb-7 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:pb-5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-accent)] sm:text-[11px]">
          FE Admin
        </p>
        <h1 className="mt-1 font-serif text-[1.75rem] leading-tight tracking-tight text-[var(--admin-ink)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&_.admin-btn]:min-h-11 [&_.admin-btn]:px-3 sm:[&_.admin-btn]:min-h-8">
          {actions}
        </div>
      ) : null}
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
        'rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 shadow-[var(--admin-shadow)] transition-colors sm:p-5',
        to &&
          'hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-surface)] active:scale-[0.99]',
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs dark:text-neutral-400">
        {title}
      </p>
      <p className="mt-2 font-serif text-2xl tabular-nums tracking-tight text-[var(--admin-ink)] sm:mt-3 sm:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs text-neutral-500 sm:mt-2 dark:text-neutral-400">{hint}</p>
      ) : null}
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
    <section className="rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel)] shadow-[var(--admin-shadow)] transition-colors">
      {title ? (
        <header className="flex items-center justify-between border-b border-[var(--admin-line)] px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h2>
        </header>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-none border border-dashed border-[var(--admin-line)] bg-[var(--admin-panel)] px-8 py-12 text-center">
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
    <div className="rounded-none border border-red-200/80 bg-red-50/80 p-5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
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
