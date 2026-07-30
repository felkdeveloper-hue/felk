import { useState } from 'react';
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
} from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsChartCard,
  AnalyticsEmpty,
  ChartSkeleton,
} from '@/components/admin/analytics';
import { useTrafficSources } from '@/hooks/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.75)',
  'hsl(var(--primary) / 0.55)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--muted-foreground) / 0.5)',
  'hsl(var(--muted-foreground) / 0.3)',
];

export function AnalyticsTrafficPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const query = useTrafficSources(filter);
  const sources = query.data ?? [];

  return (
    <PageMotion>
      <AdminPageHeader title="Traffic Sources" description="Where your visitors come from." />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {query.isError ? (
        <AdminErrorState message="Failed to load traffic data." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <ChartSkeleton />
      ) : !sources.length ? (
        <AnalyticsEmpty message="No traffic data for the selected period." />
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <AnalyticsChartCard title="Traffic distribution">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sources}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={false}
                    labelLine={false}
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
                    formatter={(v: unknown) => [(v as number).toLocaleString(), 'Visitors']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>

            <AnalyticsChartCard title="Visitors by source">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sources} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="label" type="category" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                    formatter={(v: unknown) => [(v as number).toLocaleString(), 'Visitors']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
                    Visitors
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
