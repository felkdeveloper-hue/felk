import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsChartCard,
  KpiCardWithDelta,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useReturningJourney, useAnalyticsFilters } from '@/hooks/admin';
import { adminChartColor } from '@/lib/admin-chart-colors';

export function AnalyticsReturningPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '30d' } });
  const query = useReturningJourney(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Returning Customer Journey"
        description="How long after the previous visit customers return — same visitor timeline continued."
        actions={<AnalyticsExportButton reportType="returning" filter={filter} />}
      />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load returning journey."
          onRetry={() => query.refetch()}
        />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCardWithDelta
              title="Total Returns"
              metric={{ value: data.total, prev: 0, pctChange: 0 }}
            />
            {data.buckets.map((b) => (
              <KpiCardWithDelta
                key={b.bucket}
                title={b.label}
                metric={{ value: b.count, prev: 0, pctChange: 0 }}
              />
            ))}
          </div>

          <AnalyticsChartCard title="Return Window Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.buckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Returns" fill={adminChartColor(0)} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>
        </div>
      )}
    </PageMotion>
  );
}
