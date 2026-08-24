import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsChartCard,
  AnalyticsEmpty,
  ChartSkeleton,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useTrafficSources, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';
import { ADMIN_CHART_COLORS, adminChartColor } from '@/lib/admin-chart-colors';
import { formatAnalyticsPeriodLabel } from '@/lib/analytics-period-label';

const COLORS = ADMIN_CHART_COLORS;

export function AnalyticsTrafficPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useTrafficSources(filter);
  const sources = query.data ?? [];
  const periodLabel = formatAnalyticsPeriodLabel(filter);

  return (
    <PageMotion>
      <AdminPageHeader
        title="Traffic Sources"
        description={`Where visitors come from · ${periodLabel}. Ads/social/search count unique browsers; Direct counts unique IPs.`}
        actions={
          <AnalyticsExportButton
            reportType="traffic"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />

      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState message="Failed to load traffic data." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <ChartSkeleton />
      ) : !sources.length ? (
        <AnalyticsEmpty message="No traffic data for the selected period." />
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <AnalyticsChartCard title="Traffic distribution" description="Click a source to filter">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart style={{ cursor: 'pointer' }}>
                  <Pie
                    data={sources}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={false}
                    labelLine={false}
                    onClick={(_, index) => {
                      const item = sources[index];
                      if (!item?.source) return;
                      drill({
                        destination: 'visitors',
                        label: `Visitors · ${item.label}`,
                        append: { trafficSource: item.source },
                      });
                    }}
                  >
                    {sources.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                    formatter={(
                      v: unknown,
                      _name: unknown,
                      props: { payload?: { label?: string; pct?: number } },
                    ) => [
                      `${(v as number).toLocaleString()} visits (${props.payload?.pct ?? 0}%)`,
                      props.payload?.label ?? 'Source',
                    ]}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) =>
                      value.length > 18 ? `${value.slice(0, 17)}…` : value
                    }
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>

            <AnalyticsChartCard title="Visits by source">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sources} layout="vertical" margin={{ right: 48 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                    formatter={(
                      v: unknown,
                      _name: unknown,
                      props: { payload?: { label?: string; pct?: number } },
                    ) => [
                      `${(v as number).toLocaleString()} (${props.payload?.pct ?? 0}%)`,
                      props.payload?.label ?? 'Visits',
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {sources.map((_, i) => (
                      <Cell key={i} fill={adminChartColor(i)} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      formatter={(v: unknown) => (v as number).toLocaleString()}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          </div>

          {/* Summary table */}
          <div className="bg-card border-border overflow-hidden rounded-xl border">
            <p className="border-b border-inherit px-4 py-3 text-sm font-medium">
              Source breakdown
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-inherit">
                  <th className="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium">
                    Source
                  </th>
                  <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                    Visits
                  </th>
                  <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                    Share
                  </th>
                  <th className="px-4 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.source} className="border-b border-inherit last:border-0">
                    <td className="flex items-center gap-2 px-4 py-2.5">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      {s.label}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {s.count.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                      {s.pct}%
                    </td>
                    <td className="px-4 py-2.5 pr-4">
                      <div className="flex justify-end">
                        <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${s.pct}%`,
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageMotion>
  );
}
