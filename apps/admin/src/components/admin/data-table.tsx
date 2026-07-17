import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
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
  getRowId,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(getRowId(row)));

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500">
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
                className={cn('px-4 py-3 font-medium', column.className)}
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
                className="px-4 py-10 text-center text-neutral-500"
              >
                Loading…
              </td>
            </tr>
          ) : null}
          {!isLoading && data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onToggleRow ? 1 : 0)}
                className="px-4 py-10 text-center text-neutral-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!isLoading
            ? data.map((row) => {
                const rowId = getRowId(row);
                return (
                  <tr key={rowId} className="border-t border-neutral-100 hover:bg-neutral-50">
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
  );
}
