import { useState } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import { AnalyticsFilterBar, TableSkeleton } from '@/components/admin/analytics';
import { useAnalyticsVisitors } from '@/hooks/admin';
import type { AnalyticsFilter, VisitorRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';

const columns: DataTableColumn<VisitorRow>[] = [
  {
    id: 'visitorId',
    header: 'Visitor ID',
    cell: (row) => (
      <span className="text-muted-foreground font-mono text-xs">{row.visitorId.slice(0, 8)}…</span>
    ),
  },
  {
    id: 'geo',
    header: 'Location',
    cell: (row) => [row.geo.city, row.geo.country].filter(Boolean).join(', ') || '—',
  },
  {
    id: 'device',
    header: 'Device',
    cell: (row) => [row.device.browser, row.device.type].filter(Boolean).join(' / ') || '—',
  },
  {
    id: 'device.os',
    header: 'OS',
    cell: (row) => row.device.os ?? '—',
  },
  {
    id: 'trafficSource',
    header: 'Source',
    cell: (row) => <span className="capitalize">{row.trafficSource.replace('_', ' ')}</span>,
  },
  {
    id: 'totalVisits',
    header: 'Visits',
    cell: (row) => row.totalVisits,
  },
  {
    id: 'isReturning',
    header: 'Type',
    cell: (row) =>
      row.isReturning ? (
        <span className="text-muted-foreground text-xs">Returning</span>
      ) : (
        <span className="text-xs text-emerald-600">New</span>
      ),
  },
  {
    id: 'lastSeenAt',
    header: 'Last seen',
    cell: (row) => formatDate(row.lastSeenAt),
  },
];

export function AnalyticsVisitorsPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d', page: 1 });
  const query = useAnalyticsVisitors(filter);

  return (
    <PageMotion>
      <AdminPageHeader title="Visitors" description="Every visitor tracked by the platform." />

      <AnalyticsFilterBar
        filter={filter}
        onChange={(f) => setFilter((p) => ({ ...p, ...f, page: 1 }))}
        showDevice
        showCountry
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load visitors." onRetry={() => query.refetch()} />
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
              <span>
                Showing {query.data.data.length} of {query.data.meta.total} visitors
              </span>
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
