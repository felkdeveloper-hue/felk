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
import { useAnalyticsPages } from '@/hooks/admin';
import type { AnalyticsFilter, PageStat } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';

function formatMs(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const columns: DataTableColumn<PageStat>[] = [
  {
    id: 'path',
    header: 'Page',
    cell: (row) => <span className="font-mono text-sm">{row.path}</span>,
  },
  { id: 'totalViews', header: 'Views', cell: (row) => row.totalViews.toLocaleString() },
  { id: 'uniqueViews', header: 'Unique', cell: (row) => row.uniqueViews.toLocaleString() },
  { id: 'avgTimeOnPageMs', header: 'Avg time', cell: (row) => formatMs(row.avgTimeOnPageMs) },
  { id: 'exitRate', header: 'Exit rate', cell: (row) => `${row.exitRate.toFixed(1)}%` },
  { id: 'entryRate', header: 'Entry rate', cell: (row) => `${row.entryRate.toFixed(1)}%` },
];

export function AnalyticsPagesPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d', page: 1, limit: 20 });
  const query = useAnalyticsPages(filter);

  const topPages = (query.data?.data ?? []).slice(0, 10).map((p: PageStat) => ({
    path: p.path.length > 28 ? p.path.slice(0, 28) + '…' : p.path,
    views: p.totalViews,
  }));

  return (
    <PageMotion>
      <AdminPageHeader title="Page Analytics" description="Pages sorted by total views." />

      <AnalyticsFilterBar
        filter={filter}
        onChange={(f) => setFilter((p) => ({ ...p, ...f, page: 1 }))}
        showDevice
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load pages." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className="mt-4 space-y-5">
          <AnalyticsChartCard title="Top 10 pages by views">
            {topPages.length === 0 ? (
              <AnalyticsEmpty />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topPages} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="path" type="category" width={160} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AnalyticsChartCard>

          <DataTable
            data={query.data?.data ?? []}
            isLoading={query.isFetching}
            getRowId={(row) => row.path}
            columns={columns}
          />
        </div>
      )}
    </PageMotion>
  );
}
