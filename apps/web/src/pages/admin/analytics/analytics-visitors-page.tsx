import { Link } from '@tanstack/react-router';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsExportButton,
  AnalyticsFilterBar,
  TableSkeleton,
} from '@/components/admin/analytics';
import { useAnalyticsVisitors, useAnalyticsFilters } from '@/hooks/admin';
import { ADMIN_ROUTES } from '@/constants';
import type { VisitorRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';

function formatLocation(row: VisitorRow): string {
  const parts = [row.geo.city, row.geo.region, row.geo.country ?? row.geo.countryCode].filter(
    Boolean,
  );
  return parts.join(', ') || '—';
}

const columns: DataTableColumn<VisitorRow>[] = [
  {
    id: 'customer',
    header: 'User',
    cell: (row) =>
      row.customerName || row.customerEmail ? (
        <div>
          {row.customerName ? <p className="text-sm font-medium">{row.customerName}</p> : null}
          {row.customerEmail ? (
            <p className="text-muted-foreground text-xs">{row.customerEmail}</p>
          ) : null}
          {row.userId ? (
            <Link
              to={ADMIN_ROUTES.userDetail}
              params={{ userId: row.userId }}
              className="text-primary mt-0.5 inline-block text-[10px] underline-offset-2 hover:underline"
            >
              View profile
            </Link>
          ) : null}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Guest</span>
      ),
  },
  {
    id: 'visitorId',
    header: 'Visitor ID',
    cell: (row) => (
      <span className="text-muted-foreground font-mono text-xs" title={row.visitorId}>
        {row.visitorId.slice(0, 8)}…
      </span>
    ),
  },
  {
    id: 'geo',
    header: 'Location',
    cell: (row) => <span className="text-sm">{formatLocation(row)}</span>,
  },
  {
    id: 'source',
    header: 'Source',
    cell: (row) => (
      <div className="max-w-[14rem]">
        <p className="text-sm font-medium">{row.sourceLabel ?? row.trafficSource}</p>
        <p className="text-muted-foreground text-[11px]">
          {row.sourceChannel ?? 'Unknown channel'}
        </p>
        {row.sourceDetail ? (
          <p className="text-muted-foreground mt-0.5 truncate text-[10px]" title={row.sourceDetail}>
            {row.sourceDetail}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'device',
    header: 'Device',
    cell: (row) => [row.device.browser, row.device.type].filter(Boolean).join(' / ') || '—',
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
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({
    defaults: { period: '7d', page: 1 },
  });
  const query = useAnalyticsVisitors(filter);

  return (
    <PageMotion>
      <AdminPageHeader
        title="Visitors"
        description="Track where visitors come from, who they are when logged in, and what device they use."
        actions={<AnalyticsExportButton reportType="visitors" filter={filter} allowPageScope />}
      />

      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        visible={['period', 'q', 'userId', 'device', 'browser', 'country', 'city', 'trafficSource']}
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
                  onClick={() => setFilter({ page: (filter.page ?? 1) - 1 })}
                  className="rounded-md border px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={!query.data.meta.hasNextPage}
                  onClick={() => setFilter({ page: (filter.page ?? 1) + 1 })}
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
