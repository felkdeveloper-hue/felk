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
  bulkActions?: React.ReactNode;
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
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-3">
      {onSearchChange ? (
        <input
          type="search"
          value={search ?? ''}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="focus:border-[var(--admin-accent)]/40 min-w-[220px] flex-1 rounded-lg border border-[var(--admin-line)] bg-white px-3 py-2 text-sm outline-none"
        />
      ) : null}
      {onStatusChange && statusOptions ? (
        <select
          value={status ?? ''}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-lg border border-[var(--admin-line)] bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {bulkActions}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-[var(--admin-line)] bg-white px-3 text-sm disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-sm text-neutral-500">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-[var(--admin-line)] bg-white px-3 text-sm disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
