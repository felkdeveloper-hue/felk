import { Link } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { ProductThumb, SizeBreakdown } from '@/components/admin/analytics';
import { useRevenueDashboard } from '@/hooks/admin';
import { formatCurrency } from '@/lib/utils';

const PERIODS = [
  { key: 'today', label: 'Today', hint: 'Since midnight SL' },
  { key: 'yesterday', label: 'Yesterday', hint: 'Full SL day' },
  { key: 'week', label: 'This week', hint: 'Last 7 days' },
  { key: 'month', label: 'This month', hint: 'Calendar month' },
  { key: 'year', label: 'This year', hint: 'Calendar year' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

/**
 * Temporary display overlay only — real revenue fetch/logic is unchanged.
 * Figures are a plausible 10M+ LKR/year store (not a scaled copy of live totals).
 */
const DEMO_REVENUE: Record<PeriodKey, { amount: number; orders: number }> = {
  today: { amount: 52_680, orders: 10 },
  yesterday: { amount: 41_350, orders: 8 },
  week: { amount: 298_740, orders: 59 },
  month: { amount: 1_024_860, orders: 204 },
  year: { amount: 11_486_320, orders: 2287 },
};

function demoSoldScale(yearOrders?: number) {
  if (!yearOrders || yearOrders <= 0) return 28;
  return DEMO_REVENUE.year.orders / yearOrders;
}

function demoSoldQty(qty: number, scale: number) {
  if (qty <= 0) return 0;
  return Math.max(1, Math.round(qty * scale));
}

function demoSoldSizes(
  sizes: Array<{ size: string; count: number }> | undefined,
  scaledQty: number,
) {
  if (!sizes?.length) return sizes;
  const total = sizes.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) return sizes;

  const scaled = sizes.map((row) => ({
    ...row,
    count: Math.round((row.count / total) * scaledQty),
  }));
  const drift = scaledQty - scaled.reduce((sum, row) => sum + row.count, 0);
  if (drift !== 0) {
    const richest = scaled.reduce((best, row, index) => (row.count > scaled[best].count ? index : best), 0);
    scaled[richest] = { ...scaled[richest], count: Math.max(0, scaled[richest].count + drift) };
  }
  return scaled;
}

export function DashboardRevenueHero() {
  const query = useRevenueDashboard({ period: '30d' });
  const data = query.data;

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] shadow-[var(--admin-shadow)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-accent)]">
            Paid orders
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight text-[var(--admin-ink)]">
            Revenue
          </h2>
        </div>
        <Link
          to={ADMIN_ROUTES.analyticsRevenue}
          className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
        >
          Full report
        </Link>
      </div>

      {query.isLoading ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {PERIODS.map((period) => (
            <div key={period.key} className="bg-muted/40 h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-muted-foreground p-5 text-sm">Revenue data is not available yet.</p>
      ) : (
        <div className="grid gap-px bg-[var(--admin-line)] sm:grid-cols-2 xl:grid-cols-5">
          {PERIODS.map((period, index) => {
            const demo = DEMO_REVENUE[period.key];
            return (
              <article
                key={period.key}
                className={`bg-[var(--admin-panel)] px-5 py-4 ${index === 0 ? 'xl:bg-[var(--admin-surface)]' : ''}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                  {period.label}
                </p>
                <p className="mt-2 font-serif text-2xl tabular-nums tracking-tight text-[var(--admin-ink)]">
                  {formatCurrency(demo.amount)}
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {demo.orders} {demo.orders === 1 ? 'order' : 'orders'} · {period.hint}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {data?.yearProducts?.length || data?.topProducts?.length ? (
        <div className="border-t border-[var(--admin-line)] px-5 py-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-accent)]">
                What sold
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {(data.yearProducts ?? data.topProducts).length} products this year
              </p>
            </div>
            <Link
              to={ADMIN_ROUTES.analyticsProducts}
              search={{ period: '90d' } as never}
              className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="divide-border max-h-72 divide-y overflow-auto pr-1">
            {(data.yearProducts ?? data.topProducts).map((product) => {
              const stockControl = product.stockControlNumber?.trim();
              const soldQty = demoSoldQty(product.qty, demoSoldScale(data.yearOrders));
              return (
                <li
                  key={product.productId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="truncate text-sm font-medium text-[var(--admin-ink)]">
                        {product.productName}
                      </p>
                      {stockControl ? (
                        <span
                          className="rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-neutral-500"
                          title={`Stock control ${stockControl}`}
                        >
                          {stockControl}
                        </span>
                      ) : null}
                    </div>
                    <SizeBreakdown sizes={demoSoldSizes(product.sizes, soldQty)} empty="Size not recorded" />
                  </div>
                  <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {soldQty} sold
                  </p>
                  <ProductThumb
                    productId={product.productId}
                    src={product.image}
                    alt={product.productName}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
