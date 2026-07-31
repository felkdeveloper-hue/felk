import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsEmpty,
  KpiCardWithDelta,
  TableSkeleton,
  AnalyticsChartCard,
  formatDuration,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useCartAnalytics, useAnalyticsFilters, useAnalyticsDrillDown } from '@/hooks/admin';
import type { ProductCountRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

export function AnalyticsCartPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useCartAnalytics(filter);
  const data = query.data;

  const columns: DataTableColumn<ProductCountRow>[] = [
    {
      id: 'productName',
      header: 'Product',
      cell: (row) => (
        <Drillable
          as="div"
          label={`${row.productName}: ${DRILL_TOOLTIP}`}
          onDrill={() =>
            drill({
              destination: 'productDetail',
              label: row.productName,
              entityId: row.productId,
              append: { productId: row.productId },
            })
          }
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {row.productName}
        </Drillable>
      ),
    },
    { id: 'count', header: 'Abandoned', cell: (row) => row.count },
  ];

  return (
    <PageMotion>
      <AdminPageHeader
        title="Cart Analytics"
        description="Additions, removals, abandoned carts, and average cart value."
        actions={
          <AnalyticsExportButton
            reportType="cart"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />
      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState message="Failed to load cart analytics." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCardWithDelta
              title="Cart Additions"
              metric={{ value: data.cartAdditions, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Add to cart',
                  append: { eventName: 'add_to_cart' },
                })
              }
            />
            <KpiCardWithDelta
              title="Cart Removals"
              metric={{ value: data.cartRemovals, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Remove from cart',
                  append: { eventName: 'remove_from_cart' },
                })
              }
            />
            <KpiCardWithDelta
              title="Abandoned Carts"
              metric={{ value: data.abandonedCarts, prev: 0, pctChange: 0 }}
              onDrill={() => drill({ destination: 'checkout', label: 'Abandoned checkout' })}
            />
            <KpiCardWithDelta
              title="Avg Cart Value"
              metric={{ value: data.avgCartValue, prev: 0, pctChange: 0 }}
              onDrill={() =>
                drill({
                  destination: 'events',
                  label: 'Add to cart',
                  append: { eventName: 'add_to_cart' },
                })
              }
              format={(v) => `LKR ${Number(v).toLocaleString()}`}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            Avg time before abandonment:{' '}
            {data.avgTimeToAbandonMs != null ? formatDuration(data.avgTimeToAbandonMs) : '—'}
          </p>

          <AnalyticsChartCard title="Products Most Abandoned">
            <DataTable
              data={data.mostAbandonedProducts}
              getRowId={(r) => r.productId}
              columns={columns}
            />
          </AnalyticsChartCard>
        </div>
      )}
    </PageMotion>
  );
}
