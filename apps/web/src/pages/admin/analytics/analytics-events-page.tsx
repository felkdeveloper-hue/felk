import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsChartCard,
  AnalyticsEmpty,
  TableSkeleton,
  ChartSkeleton,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import {
  useAnalyticsEvents,
  useEventBreakdown,
  useAnalyticsFilters,
  useAnalyticsDrillDown,
} from '@/hooks/admin';
import { adminChartColor } from '@/lib/admin-chart-colors';
import type { EventRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';

export function AnalyticsEventsPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({
    defaults: { period: '7d', page: 1 },
  });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useAnalyticsEvents(filter);
  const breakdown = useEventBreakdown(filter);

  const columns: DataTableColumn<EventRow>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Event',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'events',
                label: row.name,
                append: { eventName: row.name },
              })
            }
          >
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {row.name}
            </span>
          </Drillable>
        ),
      },
      {
        id: 'path',
        header: 'Page',
        cell: (row) => <span className="font-mono text-xs">{row.path ?? '—'}</span>,
      },
      {
        id: 'userId',
        header: 'User',
        cell: (row) =>
          row.userId ? (
            <Drillable
              as="div"
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: `User ${String(row.userId).slice(0, 8)}`,
                  append: { userId: String(row.userId) },
                })
              }
              className="text-primary font-mono text-xs underline-offset-2 hover:underline"
            >
              {String(row.userId).slice(0, 8)}…
            </Drillable>
          ) : (
            '—'
          ),
      },
      {
        id: 'sessionId',
        header: 'Session',
        cell: (row) =>
          row.sessionId ? (
            <Drillable
              as="div"
              onDrill={() =>
                drill({
                  destination: 'sessions',
                  label: `Session ${row.sessionId!.slice(0, 8)}`,
                  append: { sessionId: row.sessionId! },
                })
              }
              className="text-primary font-mono text-xs underline-offset-2 hover:underline"
            >
              {row.sessionId.slice(0, 8)}…
            </Drillable>
          ) : (
            '—'
          ),
      },
      { id: 'occurredAt', header: 'Time', cell: (row) => formatDate(row.occurredAt) },
    ],
    [drill],
  );

  return (
    <PageMotion>
      <AdminPageHeader
        title="Events"
        description="All tracked events — user actions, business events, and system events."
        actions={
          <AnalyticsExportButton
            reportType="events"
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
        visible={['period', 'eventName', 'userId', 'productId', 'device', 'country', 'sessionId']}
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load events." onRetry={() => query.refetch()} />
      ) : (
        <div className="mt-4 space-y-5">
          {breakdown.isLoading ? (
            <ChartSkeleton height={200} />
          ) : (
            <AnalyticsChartCard title="Events by type" description="Click a bar to filter">
              {!breakdown.data?.length ? (
                <AnalyticsEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={breakdown.data}
                    margin={{ left: 0 }}
                    style={{ cursor: 'pointer' }}
                    onClick={(state) => {
                      const payload = (
                        state as { activePayload?: Array<{ payload?: { name?: string } }> }
                      )?.activePayload?.[0]?.payload;
                      if (!payload?.name) return;
                      drill({
                        destination: 'events',
                        label: payload.name,
                        append: { eventName: payload.name },
                      });
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                      }}
                    />
                    <Bar dataKey="count" fill={adminChartColor(0)} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </AnalyticsChartCard>
          )}

          {query.isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              data={query.data?.data ?? []}
              isLoading={query.isFetching}
              getRowId={(row) => row._id}
              columns={columns}
            />
          )}

          {query.data?.meta && (
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>{query.data.meta.total} events</span>
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
