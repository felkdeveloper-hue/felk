import type { ReactNode } from 'react';

export interface ListToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: Array<{ label: string; value: string }>;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  bulkActions?: ReactNode;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  status,
  onStatusChange,
  statusOptions,
  page,
  totalPages,
  onPageChange,
  bulkActions,
}: ListToolbarProps) {
  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-3 transition-colors sm:p-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {onSearchChange ? (
          <input
            type="search"
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="focus:border-[var(--admin-accent)]/40 h-11 w-full min-w-0 flex-1 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3.5 text-base text-[var(--admin-ink)] outline-none placeholder:text-neutral-400 sm:h-10 sm:min-w-[220px] sm:rounded-lg sm:text-sm"
          />
        ) : null}
        {onStatusChange && statusOptions ? (
          <select
            value={status ?? ''}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 text-base text-[var(--admin-ink)] sm:h-10 sm:w-auto sm:rounded-lg sm:text-sm"
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {bulkActions ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">{bulkActions}</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--admin-line)] pt-3 sm:justify-end">
        <button
          type="button"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-4 text-sm font-medium text-[var(--admin-ink)] disabled:opacity-50 sm:h-9 sm:rounded-lg"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-4 text-sm font-medium text-[var(--admin-ink)] disabled:opacity-50 sm:h-9 sm:rounded-lg"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
