import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hide this column in the mobile card layout. */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found.',
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  onRowClick,
  getRowId,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(getRowId(row)));
  const mobileColumns = columns.filter((column) => !column.hideOnMobile);

  return (
    <>
      {/* Mobile cards — premium stacked rows */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] px-4 py-10 text-center text-sm text-neutral-500">
            Loading…
          </div>
        ) : null}
        {!isLoading && data.length === 0 ? (
          <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] px-4 py-10 text-center text-sm text-neutral-500">
            {emptyMessage}
          </div>
        ) : null}
        {!isLoading
          ? data.map((row) => {
              const rowId = getRowId(row);
              return (
                <article
                  key={rowId}
                  className={cn(
                    'rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 shadow-[var(--admin-shadow)] transition active:scale-[0.995]',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={
                    onRowClick
                      ? (event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest('a, button, input, label, textarea, select')) return;
                          onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {onToggleRow ? (
                    <div className="mb-3 flex items-center gap-3 border-b border-[var(--admin-line)] pb-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        aria-label={`Select row ${rowId}`}
                        checked={selectedIds.includes(rowId)}
                        onChange={() => onToggleRow(rowId)}
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Select
                      </span>
                    </div>
                  ) : null}
                  <dl className="space-y-3">
                    {mobileColumns.map((column, index) => (
                      <div
                        key={column.id}
                        className={cn(
                          'flex items-start justify-between gap-4',
                          index === 0 && 'pb-1',
                        )}
                      >
                        <dt
                          className={cn(
                            'shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500',
                            index === 0 && 'sr-only',
                          )}
                        >
                          {column.header}
                        </dt>
                        <dd
                          className={cn(
                            'min-w-0 flex-1 text-right text-sm text-[var(--admin-ink)]',
                            index === 0 && 'text-left text-base font-semibold',
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })
          : null}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] transition-colors md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--admin-surface)] text-left text-neutral-500 dark:text-neutral-400">
            <tr>
              {onToggleRow ? (
                <th scope="col" className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={onToggleAll}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (onToggleRow ? 1 : 0)}
                  className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400"
                >
                  Loading…
                </td>
              </tr>
            ) : null}
            {!isLoading && data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onToggleRow ? 1 : 0)}
                  className="px-4 py-10 text-center text-neutral-500 dark:text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data.map((row) => {
                  const rowId = getRowId(row);
                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        'border-t border-[var(--admin-line)] hover:bg-neutral-50 dark:hover:bg-white/[0.04]',
                        onRowClick && 'cursor-pointer',
                      )}
                      onClick={
                        onRowClick
                          ? (event) => {
                              const target = event.target as HTMLElement;
                              if (target.closest('a, button, input, label, textarea, select'))
                                return;
                              onRowClick(row);
                            }
                          : undefined
                      }
                    >
                      {onToggleRow ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select row ${rowId}`}
                            checked={selectedIds.includes(rowId)}
                            onChange={() => onToggleRow(rowId)}
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.id} className={cn('px-4 py-3', column.className)}>
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
