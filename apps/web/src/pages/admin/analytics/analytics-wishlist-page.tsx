import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsChartCard,
  KpiCardWithDelta,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useWishlistAnalytics, useAnalyticsFilters } from '@/hooks/admin';
import { adminChartColor } from '@/lib/admin-chart-colors';
import type { ProductCountRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';

const productColumns: DataTableColumn<ProductCountRow>[] = [
  { id: 'productName', header: 'Product', cell: (row) => row.productName },
  { id: 'count', header: 'Adds', cell: (row) => row.count },
];

export function AnalyticsWishlistPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const query = useWishlistAnalytics(filter);
  const data = query.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Wishlist Analytics"
        description="Most wishlisted products, daily activity, and largest wishlists."
        actions={<AnalyticsExportButton reportType="wishlist" filter={filter} />}
      />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load wishlist analytics."
          onRetry={() => query.refetch()}
        />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCardWithDelta
              title="Wishlist Removals"
              metric={{ value: data.removals, prev: 0, pctChange: 0 }}
            />
            <KpiCardWithDelta
              title="Top Product Adds"
              metric={{
                value: data.mostWishlisted[0]?.count ?? 0,
                prev: 0,
                pctChange: 0,
              }}
              hint={data.mostWishlisted[0]?.productName}
            />
          </div>

          <AnalyticsChartCard title="Wishlist Adds / Removals Per Day">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="adds"
                    name="Adds"
                    stroke={adminChartColor(0)}
                    fill="hsl(var(--primary) / 0.2)"
                  />
                  <Area
                    type="monotone"
                    dataKey="removals"
                    name="Removals"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive) / 0.15)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsChartCard title="Most Wishlisted Products">
              <DataTable
                data={data.mostWishlisted}
                getRowId={(r) => r.productId}
                columns={productColumns}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Customers With Largest Wishlists">
              <DataTable
                data={data.largestWishlists}
                getRowId={(r) => r.userId}
                columns={[
                  {
                    id: 'customer',
                    header: 'Customer',
                    cell: (row) => row.name || row.email || row.userId.slice(0, 8),
                  },
                  { id: 'count', header: 'Items', cell: (row) => row.count },
                ]}
              />
            </AnalyticsChartCard>
          </div>
        </div>
      )}
    </PageMotion>
  );
}
