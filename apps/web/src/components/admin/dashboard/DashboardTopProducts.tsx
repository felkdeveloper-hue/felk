import { Link } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { ProductThumb, SizeBreakdown } from '@/components/admin/analytics';
import { useProductAnalytics, useRevenueDashboard } from '@/hooks/admin';
import type { AnalyticsFilter, SizeCount } from '@/services/sdk/admin';
import { formatAnalyticsPeriodLabel } from '@/lib/analytics-period-label';

export type TopProductRow = {
  productId: string;
  productName: string;
  views: number;
  carts: number;
  purchases: number;
  cartSizes?: SizeCount[];
  soldSizes?: SizeCount[];
  image?: string | null;
};

function MetricWithSizes({ count, sizes }: { count: number; sizes?: SizeCount[] }) {
  return (
    <div className="space-y-1">
      <div className="tabular-nums">{count}</div>
      {sizes?.length ? <SizeBreakdown sizes={sizes} /> : null}
    </div>
  );
}

export function useTopProductRows(filter: AnalyticsFilter) {
  const products = useProductAnalytics(filter);
  const revenue = useRevenueDashboard(filter);
  const sold = revenue.data?.topProducts ?? [];
  const byId = new Map<string, TopProductRow>();

  for (const row of products.data?.conversion ?? []) {
    byId.set(row.productId, {
      productId: row.productId,
      productName: row.productName,
      views: row.views,
      carts: row.carts,
      purchases: row.purchases,
      image: row.image,
    });
  }

  const cartById = new Map(
    (products.data?.mostAddedToCart ?? []).map((row) => [row.productId, row]),
  );
  for (const row of sold) {
    const current = byId.get(row.productId) ?? {
      productId: row.productId,
      productName: row.productName,
      views: 0,
      carts: 0,
      purchases: 0,
    };
    current.productName = current.productName || row.productName;
    current.purchases = Math.max(current.purchases, row.qty);
    current.soldSizes = row.sizes;
    current.image = current.image || row.image;
    byId.set(row.productId, current);
  }

  for (const [productId, cart] of cartById) {
    const current = byId.get(productId) ?? {
      productId,
      productName: cart.productName,
      views: 0,
      carts: cart.count,
      purchases: 0,
    };
    current.carts = Math.max(current.carts, cart.count);
    current.cartSizes = cart.sizes;
    current.image = current.image || cart.image;
    byId.set(productId, current);
  }

  for (const list of [
    products.data?.mostViewed,
    products.data?.mostClicked,
    products.data?.mostWishlisted,
  ]) {
    for (const row of list ?? []) {
      const current = byId.get(row.productId);
      if (current && !current.image && row.image) current.image = row.image;
    }
  }

  const rows = [...byId.values()].sort(
    (a, b) => b.purchases - a.purchases || b.views - a.views || b.carts - a.carts,
  );

  return {
    rows,
    soldCount: sold.length,
    isLoading: products.isLoading || revenue.isLoading,
    isFetching: products.isFetching || revenue.isFetching,
    isError: products.isError || revenue.isError,
  };
}

export function TopProductsTable({
  filter,
  limit,
}: {
  filter: AnalyticsFilter;
  limit?: number;
}) {
  const { rows, soldCount, isLoading, isFetching } = useTopProductRows(filter);
  const visible = typeof limit === 'number' ? rows.slice(0, limit) : rows;
  const periodLabel = formatAnalyticsPeriodLabel(filter);

  if (isLoading) {
    return <div className="bg-muted/50 h-40 animate-pulse rounded-md" />;
  }

  if (!visible.length) {
    return (
      <p className="text-muted-foreground text-sm">No product activity for {periodLabel}.</p>
    );
  }

  return (
    <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      <div className="overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium">Views</th>
              <th className="pb-2 font-medium">Carts</th>
              <th className="pb-2 font-medium">Buys</th>
              <th className="w-20 pb-2 font-medium">
                <span className="sr-only">Photo</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.productId} className="border-border/60 border-t">
                <td className="max-w-56 truncate py-2 pr-3 font-medium">{row.productName}</td>
                <td className="py-2 pr-3 align-top tabular-nums">{row.views}</td>
                <td className="py-2 pr-3 align-top">
                  <MetricWithSizes count={row.carts} sizes={row.cartSizes} />
                </td>
                <td className="py-2 pr-3 align-top">
                  <MetricWithSizes count={row.purchases} sizes={row.soldSizes} />
                </td>
                <td className="py-2 pl-2 align-middle">
                  <ProductThumb productId={row.productId} src={row.image} alt={row.productName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        {typeof limit === 'number' && rows.length > limit
          ? `Showing ${visible.length} of ${rows.length} · ${soldCount} sold · ${periodLabel}`
          : `${rows.length} products · ${soldCount} sold · ${periodLabel}`}
      </p>
    </div>
  );
}

export function DashboardTopProducts() {
  const filter: AnalyticsFilter = { period: '30d' };

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] shadow-[var(--admin-shadow)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--admin-ink)]">
            Top Products
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Last 30 days · views, carts, and sales by size
          </p>
        </div>
        <Link
          to={ADMIN_ROUTES.analyticsProducts}
          search={{ period: '30d' } as never}
          className="text-xs font-medium text-teal-700 transition-colors hover:text-teal-800 hover:underline"
        >
          Open
        </Link>
      </div>
      <div className="p-4">
        <TopProductsTable filter={filter} limit={8} />
      </div>
    </section>
  );
}
