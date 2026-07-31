import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsChartCard,
  KpiCardWithDelta,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useRevenueDashboard, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';
import { adminChartColor } from '@/lib/admin-chart-colors';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

const money = (v: number) => `LKR ${Number(v).toLocaleString()}`;

export function AnalyticsRevenuePage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '30d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useRevenueDashboard(filter);
  const data = query.data;

  const toOrders = (label: string, append: Parameters<typeof drill>[0]['append'] = {}) =>
    drill({ destination: 'orders', label, append });

  return (
    <PageMotion>
      <AdminPageHeader
        title="Revenue Dashboard"
        description="Today through year revenue, AOV, and breakdowns by source, device, and location."
        actions={
          <AnalyticsExportButton
            reportType="revenue"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />
      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState message="Failed to load revenue." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCardWithDelta
              title="Today"
              metric={{ value: data.today, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Today orders', { period: 'today' })}
            />
            <KpiCardWithDelta
              title="Yesterday"
              metric={{ value: data.yesterday, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Yesterday orders', { period: 'yesterday' })}
            />
            <KpiCardWithDelta
              title="This Week"
              metric={{ value: data.week, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Week orders', { period: '7d' })}
            />
            <KpiCardWithDelta
              title="This Month"
              metric={{ value: data.month, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Month orders', { period: '30d' })}
            />
            <KpiCardWithDelta
              title="This Year"
              metric={{ value: data.year, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Year orders')}
            />
            <KpiCardWithDelta
              title="AOV (period)"
              metric={{ value: data.aov, prev: 0, pctChange: 0 }}
              format={money}
              onDrill={() => toOrders('Orders (AOV)')}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            Period revenue:{' '}
            <button
              type="button"
              title={DRILL_TOOLTIP}
              className="text-foreground hover:text-primary font-semibold underline-offset-2 hover:underline"
              onClick={() => toOrders('Period orders')}
            >
              {money(data.periodRevenue)}
            </button>{' '}
            across{' '}
            <button
              type="button"
              title={DRILL_TOOLTIP}
              className="text-foreground hover:text-primary font-semibold underline-offset-2 hover:underline"
              onClick={() => toOrders('Period orders')}
            >
              {data.orderCount} orders
            </button>
          </p>

          <AnalyticsChartCard title="Revenue Trend" description="Click a day to view that period">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend}
                  onClick={(state) => {
                    const payload = (
                      state as { activePayload?: Array<{ payload?: { date?: string } }> }
                    )?.activePayload?.[0]?.payload;
                    if (!payload?.date) return;
                    const day = payload.date;
                    drill({
                      destination: 'orders',
                      label: `Orders ${day}`,
                      append: {
                        period: 'custom',
                        from: new Date(`${day}T00:00:00.000`).toISOString(),
                        to: new Date(`${day}T23:59:59.999`).toISOString(),
                      },
                    });
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={adminChartColor(0)}
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsChartCard title="Revenue by Traffic Source">
              <DataTable
                data={data.byTrafficSource}
                getRowId={(r) => r.source}
                columns={[
                  {
                    id: 'source',
                    header: 'Source',
                    cell: (r) => (
                      <Drillable
                        as="div"
                        label={`${r.source}: ${DRILL_TOOLTIP}`}
                        onDrill={() =>
                          toOrders(`Orders · ${r.source}`, { trafficSource: r.source })
                        }
                        className="text-primary font-medium underline-offset-2 hover:underline"
                      >
                        {r.source}
                      </Drillable>
                    ),
                  },
                  { id: 'visitors', header: 'Visitors', cell: (r) => r.visitors },
                  { id: 'orders', header: 'Orders', cell: (r) => r.orders },
                  { id: 'revenue', header: 'Revenue', cell: (r) => money(r.revenue) },
                  { id: 'conversion', header: 'Conv.', cell: (r) => `${r.conversion}%` },
                ]}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Revenue by Device" description="Click a bar to drill down">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.byDevice}
                    style={{ cursor: 'pointer' }}
                    onClick={(state) => {
                      const payload = (
                        state as { activePayload?: Array<{ payload?: { device?: string } }> }
                      )?.activePayload?.[0]?.payload;
                      if (!payload?.device) return;
                      const device = payload.device as 'desktop' | 'mobile' | 'tablet' | 'unknown';
                      toOrders(`Orders · ${device}`, { device });
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill={adminChartColor(0)} radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsChartCard title="Revenue by Country">
              <DataTable
                data={data.byCountry}
                getRowId={(r) => r.country}
                columns={[
                  {
                    id: 'country',
                    header: 'Country',
                    cell: (r) => (
                      <Drillable
                        as="div"
                        label={`${r.country}: ${DRILL_TOOLTIP}`}
                        onDrill={() =>
                          toOrders(`Orders · ${r.country}`, {
                            country: r.country === 'Unknown' ? undefined : r.country,
                          })
                        }
                        className="text-primary font-medium underline-offset-2 hover:underline"
                      >
                        {r.country}
                      </Drillable>
                    ),
                  },
                  { id: 'orders', header: 'Orders', cell: (r) => r.orders },
                  { id: 'revenue', header: 'Revenue', cell: (r) => money(r.revenue) },
                ]}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Top-Selling Products">
              <DataTable
                data={data.topProducts}
                getRowId={(r) => r.productId}
                columns={[
                  {
                    id: 'productName',
                    header: 'Product',
                    cell: (r) => (
                      <Drillable
                        as="div"
                        label={`${r.productName}: ${DRILL_TOOLTIP}`}
                        onDrill={() =>
                          drill({
                            destination: 'productDetail',
                            label: r.productName,
                            entityId: r.productId,
                            append: { productId: r.productId },
                          })
                        }
                        className="text-primary font-medium underline-offset-2 hover:underline"
                      >
                        {r.productName}
                      </Drillable>
                    ),
                  },
                  { id: 'qty', header: 'Qty', cell: (r) => r.qty },
                  {
                    id: 'revenue',
                    header: 'Revenue',
                    cell: (r) => (
                      <Drillable
                        as="div"
                        onDrill={() =>
                          toOrders(`Orders · ${r.productName}`, { productId: r.productId })
                        }
                        className="hover:underline"
                      >
                        {money(r.revenue)}
                      </Drillable>
                    ),
                  },
                ]}
              />
            </AnalyticsChartCard>
          </div>
        </div>
      )}
    </PageMotion>
  );
}
