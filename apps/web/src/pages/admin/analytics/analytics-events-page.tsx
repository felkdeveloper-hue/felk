import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsChartCard,
  AnalyticsEmpty,
  TableSkeleton,
  ChartSkeleton,
} from '@/components/admin/analytics';
import { useAnalyticsEvents, useEventBreakdown, useEventNames } from '@/hooks/admin';
import type { AnalyticsFilter, EventRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { formatDate } from '@/lib/utils';

const columns: DataTableColumn<EventRow>[] = [
  {
    id: 'name',
    header: 'Event',
    cell: (row) => (
      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
        {row.name}
      </span>
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
        <span className="font-mono text-xs">{String(row.userId).slice(0, 8)}…</span>
      ) : (
        '—'
      ),
  },
  {
    id: 'visitorId',
    header: 'Visitor',
    cell: (row) =>
      row.visitorId ? <span className="font-mono text-xs">{row.visitorId.slice(0, 8)}…</span> : '—',
  },
  { id: 'occurredAt', header: 'Time', cell: (row) => formatDate(row.occurredAt) },
];

export function AnalyticsEventsPage() {
  const [filter, setFilter] = useState<AnalyticsFilter & { eventName?: string }>({
    period: '7d',
    page: 1,
  });
  const query = useAnalyticsEvents(filter);
  const breakdown = useEventBreakdown(filter);
  const names = useEventNames(filter);

  return (
    <PageMotion>
      <AdminPageHeader
        title="Events"
        description="All tracked events — user actions, business events, and system events."
      />

      <div className="flex flex-wrap items-center gap-2">
        <AnalyticsFilterBar
          filter={filter}
          onChange={(f) => setFilter((p) => ({ ...p, ...f, page: 1 }))}
        />
        <select
          value={filter.eventName ?? ''}
          onChange={(e) =>
            setFilter((p) => ({ ...p, eventName: e.target.value || undefined, page: 1 }))
          }
          className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="">All events</option>
          {(names.data ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {query.isError ? (
        <AdminErrorState message="Failed to load events." onRetry={() => query.refetch()} />
      ) : (
        <div className="mt-4 space-y-5">
          {breakdown.isLoading ? (
            <ChartSkeleton height={200} />
          ) : (
            <AnalyticsChartCard title="Events by type">
              {!breakdown.data?.length ? (
                <AnalyticsEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breakdown.data} margin={{ left: 0 }}>
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
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
