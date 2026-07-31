import { useMemo } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  TableSkeleton,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useAnalyticsSessions, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';
import type { SessionRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

function formatDuration(ms: number | null | undefined) {
  if (ms == null || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function AnalyticsSessionsPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({
    defaults: { period: '7d', page: 1 },
  });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useAnalyticsSessions(filter);

  const columns: DataTableColumn<SessionRow>[] = useMemo(
    () => [
      {
        id: 'sessionId',
        header: 'Session',
        cell: (row) => (
          <Drillable
            as="div"
            label={`Replay session: ${DRILL_TOOLTIP}`}
            onDrill={() =>
              drill({
                destination: 'sessions',
                label: `Session ${row.sessionId.slice(0, 8)}…`,
                append: { sessionId: row.sessionId },
              })
            }
            className="text-primary font-mono text-xs underline-offset-2 hover:underline"
          >
            {row.sessionId.slice(0, 10)}…
          </Drillable>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: (row) =>
          row.userId ? (
            <Drillable
              as="div"
              label={`Customer events: ${DRILL_TOOLTIP}`}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: row.customerEmail ?? 'Customer events',
                  append: { userId: String(row.userId), sessionId: row.sessionId },
                })
              }
              className="text-primary text-sm underline-offset-2 hover:underline"
            >
              {row.customerEmail ?? `${String(row.userId).slice(0, 8)}…`}
            </Drillable>
          ) : (
            <span className="text-muted-foreground text-xs">Guest</span>
          ),
      },
      {
        id: 'durationMs',
        header: 'Session Duration',
        cell: (row) => formatDuration(row.durationMs),
      },
      {
        id: 'activeMs',
        header: 'Active Time',
        cell: (row) => formatDuration(row.activeMs),
      },
      {
        id: 'idleMs',
        header: 'Idle Time',
        cell: (row) => formatDuration(row.idleMs),
      },
      {
        id: 'pageCount',
        header: 'Pages Viewed',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'pages',
                label: 'Pages',
                append: { sessionId: row.sessionId },
              })
            }
          >
            {row.pageCount}
          </Drillable>
        ),
      },
      { id: 'clickCount', header: 'Clicks', cell: (row) => row.clickCount },
      {
        id: 'maxScrollDepth',
        header: 'Scroll %',
        cell: (row) => `${row.maxScrollDepth ?? 0}%`,
      },
      {
        id: 'lastPage',
        header: 'Last Page',
        cell: (row) => (
          <span className="max-w-[160px] truncate text-xs">
            {row.lastPage ?? row.exitPage ?? '—'}
          </span>
        ),
      },
      {
        id: 'deviceType',
        header: 'Device',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'sessions',
                label: `Device · ${row.deviceType}`,
                append: {
                  device: row.deviceType as 'desktop' | 'mobile' | 'tablet' | 'unknown',
                  browser: row.browser ?? undefined,
                },
              })
            }
            className="capitalize"
          >
            {row.deviceType} {row.browser ? `/ ${row.browser}` : ''}
          </Drillable>
        ),
      },
      { id: 'startedAt', header: 'Started', cell: (row) => formatDate(row.startedAt) },
    ],
    [drill],
  );

  return (
    <PageMotion>
      <AdminPageHeader
        title="Sessions"
        description="Engagement metrics for every visitor session. Click a customer for activity/replay."
        actions={
          <AnalyticsExportButton
            reportType="sessions"
            filter={filter}
            allowPageScope
            drillLabel={trail.at(-1)?.label}
          />
        }
      />

      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        visible={[
          'period',
          'userId',
          'sessionId',
          'device',
          'browser',
          'country',
          'trafficSource',
          'q',
        ]}
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
