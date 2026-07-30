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
import { useDeviceBreakdown } from '@/hooks/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.45)',
  'hsl(var(--primary) / 0.25)',
  'hsl(var(--muted-foreground) / 0.4)',
];

export function AnalyticsDevicesPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const query = useDeviceBreakdown(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Devices"
        description="Breakdown of visitors by device type, browser, and operating system."
      />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {query.isError ? (
        <AdminErrorState message="Failed to load device data." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <ChartSkeleton height={240} />
          <ChartSkeleton height={240} />
          <ChartSkeleton height={240} />
        </div>
      ) : !data ? null : (
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {/* Device types */}
          <AnalyticsChartCard title="Device type">
            {!data.deviceTypes.length ? (
              <AnalyticsEmpty />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.deviceTypes}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={false}
                    labelLine={false}
                  >
                    {data.deviceTypes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </AnalyticsChartCard>

          {/* Browsers */}
          <AnalyticsChartCard title="Browsers">
            {!data.browsers.length ? (
              <AnalyticsEmpty />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.browsers} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="label" type="category" width={70} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AnalyticsChartCard>

          {/* OS */}
          <AnalyticsChartCard title="Operating systems">
            {!data.operatingSystems.length ? (
              <AnalyticsEmpty />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.operatingSystems} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="label" type="category" width={70} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary) / 0.7)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AnalyticsChartCard>
        </div>
      )}

      {/* Summary table */}
      {data && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {[
            { title: 'Device types', rows: data.deviceTypes },
            { title: 'Top browsers', rows: data.browsers },
          ].map(({ title, rows }) => (
            <div key={title} className="bg-card border-border overflow-hidden rounded-xl border">
              <p className="border-b border-inherit px-4 py-3 text-sm font-medium">{title}</p>
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b border-inherit last:border-0">
                      <td className="px-4 py-2.5 capitalize">{r.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {r.count.toLocaleString()}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-right">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </PageMotion>
  );
}
