import { Button } from '@fe-platform/ui';

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
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {onSearchChange ? (
        <input
          type="search"
          value={search ?? ''}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
      ) : null}
      {onStatusChange && statusOptions ? (
        <select
          value={status ?? ''}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
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
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-neutral-500">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
