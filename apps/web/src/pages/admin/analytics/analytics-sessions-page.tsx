import { useState } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import { AnalyticsFilterBar, TableSkeleton } from '@/components/admin/analytics';
import { useAnalyticsSessions } from '@/hooks/admin';
import type { AnalyticsFilter, SessionRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';

function formatMs(ms: number | null | undefined) {
  if (!ms) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const columns: DataTableColumn<SessionRow>[] = [
  {
    id: 'sessionId',
    header: 'Session',
    cell: (row) => (
      <span className="text-muted-foreground font-mono text-xs">{row.sessionId.slice(0, 8)}…</span>
    ),
  },
  { id: 'entryPage', header: 'Entry', cell: (row) => row.entryPage ?? '—' },
  { id: 'exitPage', header: 'Exit', cell: (row) => row.exitPage ?? '—' },
  { id: 'pageCount', header: 'Pages', cell: (row) => row.pageCount },
  { id: 'durationMs', header: 'Duration', cell: (row) => formatMs(row.durationMs) },
  {
    id: 'deviceType',
    header: 'Device',
    cell: (row) => (
      <span className="capitalize">
        {row.deviceType} {row.browser ? `/ ${row.browser}` : ''}
      </span>
    ),
  },
  { id: 'country', header: 'Country', cell: (row) => row.country ?? '—' },
  {
    id: 'isBounce',
    header: 'Bounce',
    cell: (row) =>
      row.isBounce ? (
        <span className="text-xs text-amber-600">Yes</span>
      ) : (
        <span className="text-xs text-emerald-600">No</span>
      ),
  },
  {
    id: 'isActive',
    header: 'Status',
    cell: (row) =>
      row.isActive ? (
        <span className="text-xs text-emerald-600">Active</span>
      ) : (
        <span className="text-muted-foreground text-xs">Ended</span>
      ),
  },
  { id: 'startedAt', header: 'Started', cell: (row) => formatDate(row.startedAt) },
];

export function AnalyticsSessionsPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d', page: 1 });
  const query = useAnalyticsSessions(filter);

  return (
    <PageMotion>
      <AdminPageHeader title="Sessions" description="Every visitor session recorded." />

      <AnalyticsFilterBar
        filter={filter}
        onChange={(f) => setFilter((p) => ({ ...p, ...f, page: 1 }))}
        showDevice
        showCountry
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load sessions." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="mt-4">
          <DataTable
            data={query.data?.data ?? []}
            isLoading={query.isFetching}
            getRowId={(row) => row._id}
            columns={columns}
          />
          {query.data?.meta && (
            <div className="text-muted-foreground mt-3 flex items-center justify-between text-sm">
              <span>{query.data.meta.total} sessions total</span>
              <div className="flex gap-2">
                <button
                  disabled={filter.page === 1}
                  onClick={() => setFilter((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={!query.data.meta.hasNextPage}
                  onClick={() => setFilter((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageMotion>
  );
}
