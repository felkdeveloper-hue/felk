import { useMemo, useState } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion, DataTable } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsEmpty,
  TableSkeleton,
  AnalyticsChartCard,
  Drillable,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import {
  useProductAnalytics,
  useProductInterest,
  useAnalyticsFilters,
  useAnalyticsDrillDown,
} from '@/hooks/admin';
import type { ProductCountRow, ProductConversionRow } from '@/services/sdk/admin';
import type { DataTableColumn } from '@/components/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

export function AnalyticsProductsPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const [interestId, setInterestId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const query = useProductAnalytics(filter);
  const interest = useProductInterest(lookupId, filter);
  const data = query.data;

  const openProduct = (productId: string, productName: string) =>
    drill({
      destination: 'productDetail',
      label: productName,
      entityId: productId,
      append: { productId },
    });

  const productColumns = (countHeader: string): DataTableColumn<ProductCountRow>[] => [
    {
      id: 'productName',
      header: 'Product',
      cell: (row) => (
        <Drillable
          as="div"
          label={`${row.productName}: ${DRILL_TOOLTIP}`}
          onDrill={() => openProduct(row.productId, row.productName)}
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {row.productName}
        </Drillable>
      ),
    },
    {
      id: 'count',
      header: countHeader,
      cell: (row) => (
        <Drillable
          as="div"
          onDrill={() =>
            drill({
              destination: 'events',
              label: `${countHeader} · ${row.productName}`,
              append: { productId: row.productId },
            })
          }
        >
          {row.count}
        </Drillable>
      ),
    },
  ];

  const conversionColumns: DataTableColumn<ProductConversionRow>[] = useMemo(
    () => [
      {
        id: 'productName',
        header: 'Product',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() => openProduct(row.productId, row.productName)}
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            {row.productName}
          </Drillable>
        ),
      },
      {
        id: 'views',
        header: 'Views',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'sessions',
                label: `Views · ${row.productName}`,
                append: { productId: row.productId },
              })
            }
          >
            {row.views}
          </Drillable>
        ),
      },
      {
        id: 'carts',
        header: 'Cart',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'cart',
                label: `Cart · ${row.productName}`,
                append: { productId: row.productId },
              })
            }
          >
            {row.carts}
          </Drillable>
        ),
      },
      {
        id: 'purchases',
        header: 'Purchases',
        cell: (row) => (
          <Drillable
            as="div"
            onDrill={() =>
              drill({
                destination: 'orders',
                label: `Orders · ${row.productName}`,
                append: { productId: row.productId },
              })
            }
          >
            {row.purchases}
          </Drillable>
        ),
      },
      {
        id: 'conversionRate',
        header: 'Views → Purchase',
        cell: (row) => `${row.conversionRate}%`,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drill],
  );

  return (
    <PageMotion>
      <AdminPageHeader
        title="Product Analytics"
        description="Views, clicks, cart adds, wishlists, and conversion by product."
        actions={
          <AnalyticsExportButton
            reportType="products"
            filter={filter}
            drillLabel={trail.at(-1)?.label}
          />
        }
      />
      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {query.isError ? (
        <AdminErrorState
          message="Failed to load product analytics."
          onRetry={() => query.refetch()}
        />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : !data ? (
        <AnalyticsEmpty />
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsChartCard title="Most Viewed Products">
              <DataTable
                data={data.mostViewed}
                getRowId={(r) => r.productId}
                columns={productColumns('Views')}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Most Clicked Products">
              <DataTable
                data={data.mostClicked}
                getRowId={(r) => r.productId}
                columns={productColumns('Clicks')}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Most Added To Cart">
              <DataTable
                data={data.mostAddedToCart}
                getRowId={(r) => r.productId}
                columns={productColumns('Count')}
              />
            </AnalyticsChartCard>
            <AnalyticsChartCard title="Most Wishlisted">
              <DataTable
                data={data.mostWishlisted}
                getRowId={(r) => r.productId}
                columns={productColumns('Count')}
              />
            </AnalyticsChartCard>
          </div>

          <AnalyticsChartCard title="Highest Conversion Products">
            <DataTable
              data={data.conversion}
              getRowId={(r) => r.productId}
              columns={conversionColumns}
            />
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Product Interest Heatmap">
            <div className="mb-4 flex flex-wrap gap-2">
              <Input
                placeholder="Product ID"
                value={interestId}
                onChange={(e) => setInterestId(e.target.value)}
                className="max-w-xs"
              />
              <Button type="button" onClick={() => setLookupId(interestId.trim())}>
                Load interest
              </Button>
            </div>
            {lookupId && interest.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : interest.data ? (
              <div className="grid gap-3 sm:grid-cols-5">
                <Metric
                  label="Views"
                  value={interest.data.views}
                  onDrill={() =>
                    drill({
                      destination: 'sessions',
                      label: `Views · ${interest.data!.productName}`,
                      append: { productId: lookupId },
                    })
                  }
                />
                <Metric
                  label="Clicks"
                  value={interest.data.clicks}
                  onDrill={() =>
                    drill({
                      destination: 'events',
                      label: `Clicks · ${interest.data!.productName}`,
                      append: { productId: lookupId },
                    })
                  }
                />
                <Metric
                  label="Wishlist"
                  value={interest.data.wishlistAdds}
                  onDrill={() =>
                    drill({
                      destination: 'wishlist',
                      label: `Wishlist · ${interest.data!.productName}`,
                      append: { productId: lookupId },
                    })
                  }
                />
                <Metric
                  label="Cart"
                  value={interest.data.cartAdds}
                  onDrill={() =>
                    drill({
                      destination: 'cart',
                      label: `Cart · ${interest.data!.productName}`,
                      append: { productId: lookupId },
                    })
                  }
                />
                <Metric
                  label="Purchased"
                  value={interest.data.purchases}
                  onDrill={() =>
                    drill({
                      destination: 'orders',
                      label: `Orders · ${interest.data!.productName}`,
                      append: { productId: lookupId },
                    })
                  }
                />
              </div>
            ) : lookupId ? (
              <p className="text-muted-foreground text-sm">No interest data for this product.</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Enter a product ID to see views, clicks, wishlist, cart, and purchases.
              </p>
            )}
            {interest.data ? (
              <p className="mt-3 text-sm font-medium">{interest.data.productName}</p>
            ) : null}
          </AnalyticsChartCard>
        </div>
      )}
    </PageMotion>
  );
}

function Metric({ label, value, onDrill }: { label: string; value: number; onDrill?: () => void }) {
  const body = (
    <>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </>
  );
  if (!onDrill) return <div className="rounded-lg border p-3">{body}</div>;
  return (
    <button
      type="button"
      title={DRILL_TOOLTIP}
      onClick={onDrill}
      className="hover:border-primary/40 hover:bg-primary/5 cursor-pointer rounded-lg border p-3 text-left transition-colors"
    >
      {body}
    </button>
  );
}
