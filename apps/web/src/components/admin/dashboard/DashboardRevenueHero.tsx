import { Link } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { useRevenueDashboard } from '@/hooks/admin';
import { formatCurrency } from '@/lib/utils';

const PERIODS = [
  { key: 'today', label: 'Today', hint: 'Since midnight' },
  { key: 'yesterday', label: 'Yesterday', hint: 'Full day' },
  { key: 'week', label: 'This week', hint: 'Last 7 days' },
  { key: 'month', label: 'This month', hint: 'Calendar month' },
  { key: 'year', label: 'This year', hint: 'Calendar year' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

function orderCount(
  data: {
    todayOrders?: number;
    yesterdayOrders?: number;
    weekOrders?: number;
    monthOrders?: number;
    yearOrders?: number;
  },
  key: PeriodKey,
) {
  if (key === 'today') return data.todayOrders ?? 0;
  if (key === 'yesterday') return data.yesterdayOrders ?? 0;
  if (key === 'week') return data.weekOrders ?? 0;
  if (key === 'month') return data.monthOrders ?? 0;
  return data.yearOrders ?? 0;
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
            const orders = orderCount(data, period.key);
            return (
              <article
                key={period.key}
                className={`bg-[var(--admin-panel)] px-5 py-4 ${index === 0 ? 'xl:bg-[var(--admin-surface)]' : ''}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                  {period.label}
                </p>
                <p className="mt-2 font-serif text-2xl tabular-nums tracking-tight text-[var(--admin-ink)]">
                  {formatCurrency(data[period.key])}
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {orders} {orders === 1 ? 'order' : 'orders'} · {period.hint}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
