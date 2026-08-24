import { memo, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ADMIN_ROUTES } from '@/constants';
import {
  useActivityFeed,
  useAnalyticsOverview,
  useCartAnalytics,
  useCheckoutAbandon,
  useDeviceBreakdown,
  useGeoBreakdown,
  useLiveVisitors,
  useProductAnalytics,
  useProductFunnel,
  useRevenueDashboard,
  useSearchAnalytics,
  useTrafficSources,
  useWishlistAnalytics,
  useDashboardStatsQuery,
} from '@/hooks/admin';
import { AnalyticsEmpty, KpiCardWithDelta, formatDuration } from '@/components/admin/analytics';
import { AdminStatCard } from '@/components/admin';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsFilter, DashboardWidgetPlacement } from '@/services/sdk/admin';
import { ADMIN_CHART_COLORS, adminChartColor } from '@/lib/admin-chart-colors';

const COLORS = ADMIN_CHART_COLORS;

function periodFilter(settings?: DashboardWidgetPlacement['settings']): AnalyticsFilter {
  const period = (settings?.period as AnalyticsFilter['period']) || '7d';
  return { period };
}

function periodLabel(period: string | undefined): string {
  const map: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 days',
    '14d': 'Last 14 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '180d': 'Last 180 days',
    '1y': 'Last 12 months',
  };
  return map[period ?? '7d'] ?? 'Last 7 days';
}

function WidgetFrame({
  title,
  href,
  children,
  collapsed,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--admin-line)] bg-gradient-to-b from-[var(--admin-panel)] to-[var(--admin-bg)] shadow-sm">
      <div className="border-[var(--admin-line)]/80 bg-[var(--admin-panel)]/80 flex items-center justify-between border-b px-3.5 py-2.5">
        <h3 className="text-sm font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h3>
        {href ? (
          <Link
            to={href as never}
            className="text-xs font-medium text-teal-700 transition-colors hover:text-teal-800 hover:underline"
          >
            Open
          </Link>
        ) : null}
      </div>
      {!collapsed ? <div className="min-h-0 flex-1 overflow-auto p-3.5">{children}</div> : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="bg-muted/50 h-full min-h-[4rem] animate-pulse rounded-md" />;
}

const RevenueWidget = memo(function RevenueWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const filter = periodFilter(placement.settings);
  const q = useRevenueDashboard(filter);
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data) return <AnalyticsEmpty message="No revenue data" />;
  const rows = [
    { label: 'Today', value: q.data.today, orders: q.data.todayOrders },
    { label: 'Yesterday', value: q.data.yesterday, orders: q.data.yesterdayOrders },
    { label: 'Week', value: q.data.week, orders: q.data.weekOrders },
    { label: 'Month', value: q.data.month, orders: q.data.monthOrders },
    { label: 'Year', value: q.data.year, orders: q.data.yearOrders },
  ];
  return (
    <WidgetFrame
      title="Revenue"
      href={ADMIN_ROUTES.analyticsRevenue}
      collapsed={placement.collapsed}
    >
      <div className="flex h-full flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-[var(--admin-bg)] px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">
                {row.label}
              </div>
              {typeof row.orders === 'number' ? (
                <div className="text-muted-foreground mt-0.5 text-[11px]">
                  {row.orders} {row.orders === 1 ? 'order' : 'orders'}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-base font-semibold tabular-nums">
              {formatCurrency(row.value)}
            </div>
          </div>
        ))}
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-4 text-xs">
          <span>AOV {formatCurrency(q.data.aov)}</span>
          <span>{q.data.orderCount} orders in selected period</span>
        </div>
      </div>
    </WidgetFrame>
  );
});

const VisitorsWidget = memo(function VisitorsWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useAnalyticsOverview(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data) return <AnalyticsEmpty />;
  return (
    <KpiCardWithDelta title="Visitors" metric={q.data.totalVisitors} hint="Unique visitor IDs" />
  );
});

const SessionsWidget = memo(function SessionsWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useAnalyticsOverview(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data) return <AnalyticsEmpty />;
  return (
    <WidgetFrame
      title="Sessions"
      href={ADMIN_ROUTES.analyticsSessions}
      collapsed={placement.collapsed}
    >
      <div className="text-2xl font-semibold tabular-nums">
        {formatDuration(q.data.avgSessionDurationMs.value)}
      </div>
      <div className="text-muted-foreground text-xs">
        avg duration · {q.data.sessionsToday} sessions today
      </div>
    </WidgetFrame>
  );
});

const ProductsWidget = memo(function ProductsWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useProductAnalytics(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  const top = q.data?.mostViewed?.slice(0, 5) ?? [];
  return (
    <WidgetFrame
      title="Products"
      href={ADMIN_ROUTES.analyticsProducts}
      collapsed={placement.collapsed}
    >
      {!top.length ? (
        <AnalyticsEmpty message="No product views" />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {top.map((p) => (
            <li key={p.productId} className="flex justify-between gap-2">
              <span className="truncate">{p.productName || p.productId}</span>
              <span className="text-muted-foreground tabular-nums">{p.count}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
});

const TopProductsWidget = memo(function TopProductsWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useProductAnalytics(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  const rows = q.data?.conversion?.slice(0, 8) ?? [];
  return (
    <WidgetFrame
      title="Top Products"
      href={ADMIN_ROUTES.analyticsProducts}
      collapsed={placement.collapsed}
    >
      {!rows.length ? (
        <AnalyticsEmpty />
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-1 font-medium">Product</th>
                <th className="pb-1 font-medium">Views</th>
                <th className="pb-1 font-medium">Carts</th>
                <th className="pb-1 font-medium">Buys</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId} className="border-border/60 border-t">
                  <td className="max-w-[10rem] truncate py-1">{r.productName}</td>
                  <td className="py-1 tabular-nums">{r.views}</td>
                  <td className="py-1 tabular-nums">{r.carts}</td>
                  <td className="py-1 tabular-nums">{r.purchases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetFrame>
  );
});

const SearchWidget = memo(function SearchWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useSearchAnalytics(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data) return <AnalyticsEmpty />;
  const zeroRate =
    q.data.totals.searches > 0
      ? Math.round((q.data.totals.zeroResults / q.data.totals.searches) * 100)
      : 0;
  return (
    <WidgetFrame title="Search" href={ADMIN_ROUTES.analyticsSearch} collapsed={placement.collapsed}>
      <div className="grid h-full min-h-0 grid-cols-[auto_1fr] gap-4">
        <div className="grid grid-cols-2 content-start gap-x-4 gap-y-1 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Searches</div>
            <div className="text-2xl font-semibold tabular-nums">{q.data.totals.searches}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Zero results</div>
            <div className="text-2xl font-semibold tabular-nums">{zeroRate}%</div>
          </div>
        </div>
        <ul className="min-h-0 space-y-1 overflow-auto text-xs">
          {(q.data.keywords ?? []).slice(0, 4).map((k) => (
            <li key={k.query} className="flex justify-between gap-2">
              <span className="truncate">{k.query || '(empty)'}</span>
              <span className="text-muted-foreground tabular-nums">{k.searches}</span>
            </li>
          ))}
        </ul>
      </div>
    </WidgetFrame>
  );
});

const FunnelWidget = memo(function FunnelWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useProductFunnel(periodFilter(placement.settings));
  const stages = useMemo(() => q.data?.stages ?? [], [q.data?.stages]);
  if (q.isLoading) return <LoadingBlock />;
  return (
    <WidgetFrame title="Funnel" href={ADMIN_ROUTES.analyticsFunnel} collapsed={placement.collapsed}>
      {!stages.length ? (
        <AnalyticsEmpty />
      ) : (
        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
          <BarChart data={stages} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" radius={3}>
              {stages.map((_, i) => (
                <Cell key={i} fill={adminChartColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetFrame>
  );
});

const DevicesWidget = memo(function DevicesWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useDeviceBreakdown(periodFilter(placement.settings));
  const data = useMemo(
    () =>
      (q.data?.deviceTypes ?? []).map((d) => ({
        name: d.label || 'unknown',
        value: d.count,
      })),
    [q.data?.deviceTypes],
  );
  if (q.isLoading) return <LoadingBlock />;
  return (
    <WidgetFrame
      title="Devices"
      href={ADMIN_ROUTES.analyticsDevices}
      collapsed={placement.collapsed}
    >
      {!data.length ? (
        <AnalyticsEmpty />
      ) : (
        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </WidgetFrame>
  );
});

const GeoWidget = memo(function GeoWidget({ placement }: { placement: DashboardWidgetPlacement }) {
  const q = useGeoBreakdown(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  const rows = q.data?.countries?.slice(0, 6) ?? [];
  return (
    <WidgetFrame title="Geography" href={ADMIN_ROUTES.analyticsGeo} collapsed={placement.collapsed}>
      {!rows.length ? (
        <AnalyticsEmpty />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.country || 'unknown'} className="flex justify-between gap-2">
              <span>{r.country || 'Unknown'}</span>
              <span className="text-muted-foreground tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
});

const TrafficWidget = memo(function TrafficWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const period = (placement.settings?.period as string) || '7d';
  const q = useTrafficSources(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  const rows = (q.data ?? []).slice(0, 8);
  const top = rows[0];
  const totalVisits = rows.reduce((s, r) => s + r.count, 0);
  return (
    <WidgetFrame
      title="Sources"
      href={ADMIN_ROUTES.analyticsTraffic}
      collapsed={placement.collapsed}
    >
      {!rows.length ? (
        <AnalyticsEmpty />
      ) : (
        <div className="flex h-full flex-col gap-3">
          {top ? (
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.16em]">
                Top source · {periodLabel(period)}
              </p>
              <p className="mt-0.5 text-lg font-semibold leading-tight">{top.label}</p>
              <p className="text-muted-foreground text-xs">
                {top.pct}% of {totalVisits.toLocaleString()} visit{totalVisits !== 1 ? 's' : ''}
                {top.channel ? ` · ${top.channel}` : ''}
              </p>
            </div>
          ) : null}
          <ul className="space-y-2.5">
            {rows.map((row, index) => (
              <li key={`${row.label}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 truncate font-medium">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: adminChartColor(index) }}
                    />
                    {row.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {row.count.toLocaleString()} · {row.pct}%
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(row.pct, 2)}%`,
                      backgroundColor: adminChartColor(index),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetFrame>
  );
});

const LiveActivityWidget = memo(function LiveActivityWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useLiveVisitors();
  if (q.isLoading) return <LoadingBlock />;
  const visitors = q.data ?? [];
  return (
    <WidgetFrame
      title="Live Activity"
      href={ADMIN_ROUTES.analyticsLive}
      collapsed={placement.collapsed}
    >
      <div className="mb-2 text-2xl font-semibold tabular-nums">{visitors.length}</div>
      <div className="text-muted-foreground mb-2 text-xs">active now</div>
      <ul className="space-y-1 text-xs">
        {visitors.slice(0, 5).map((v) => (
          <li key={v.sessionId} className="truncate">
            {v.currentPage || '/'} · {v.deviceType || 'device'}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
});

const CheckoutWidget = memo(function CheckoutWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useCheckoutAbandon(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data) return <AnalyticsEmpty />;
  return (
    <WidgetFrame
      title="Checkout"
      href={ADMIN_ROUTES.analyticsCheckout}
      collapsed={placement.collapsed}
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Abandoned</div>
          <div className="text-lg font-semibold tabular-nums">{q.data.funnel.abandoned}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Recovered</div>
          <div className="text-lg font-semibold tabular-nums">
            {formatCurrency(q.data.revenueRecovered ?? 0)}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
});

const WishlistWidget = memo(function WishlistWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useWishlistAnalytics(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  return (
    <WidgetFrame
      title="Wishlist"
      href={ADMIN_ROUTES.analyticsWishlist}
      collapsed={placement.collapsed}
    >
      <div className="text-lg font-semibold tabular-nums">
        {(q.data?.daily ?? []).reduce((s, d) => s + d.adds, 0)}
      </div>
      <div className="text-muted-foreground text-xs">adds in period</div>
    </WidgetFrame>
  );
});

const CartWidget = memo(function CartWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useCartAnalytics(periodFilter(placement.settings));
  if (q.isLoading) return <LoadingBlock />;
  return (
    <WidgetFrame title="Cart" href={ADMIN_ROUTES.analyticsCart} collapsed={placement.collapsed}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Adds</div>
          <div className="text-lg font-semibold tabular-nums">{q.data?.cartAdditions ?? 0}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Abandoned</div>
          <div className="text-lg font-semibold tabular-nums">{q.data?.abandonedCarts ?? 0}</div>
        </div>
      </div>
    </WidgetFrame>
  );
});

const RecentActivityWidget = memo(function RecentActivityWidget({
  placement,
}: {
  placement: DashboardWidgetPlacement;
}) {
  const q = useActivityFeed();
  if (q.isLoading) return <LoadingBlock />;
  const items = q.data ?? [];
  return (
    <WidgetFrame
      title="Recent Activity"
      href={ADMIN_ROUTES.analyticsActivity}
      collapsed={placement.collapsed}
    >
      {!items.length ? (
        <AnalyticsEmpty message="No recent activity" />
      ) : (
        <ul className="space-y-1.5 text-xs">
          {items.slice(0, 12).map((item) => (
            <li
              key={`${item.at}-${item.name}-${item.sessionId}`}
              className="flex justify-between gap-2"
            >
              <span className="truncate">{item.label || item.name}</span>
              <span className="text-muted-foreground shrink-0">
                {new Date(item.at).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
});

const OpsOrdersWidget = memo(function OpsOrdersWidget() {
  const q = useDashboardStatsQuery();
  if (q.isLoading) return <LoadingBlock />;
  return <AdminStatCard title="Orders" value={q.data?.orderCount ?? 0} to={ADMIN_ROUTES.orders} />;
});

const OpsCustomersWidget = memo(function OpsCustomersWidget() {
  const q = useDashboardStatsQuery();
  if (q.isLoading) return <LoadingBlock />;
  return (
    <AdminStatCard
      title="Customers"
      value={q.data?.customerCount ?? 0}
      to={ADMIN_ROUTES.customers}
    />
  );
});

export const WIDGET_COMPONENTS: Record<
  string,
  React.ComponentType<{ placement: DashboardWidgetPlacement }>
> = {
  revenue: RevenueWidget,
  visitors: VisitorsWidget,
  sessions: SessionsWidget,
  products: ProductsWidget,
  top_products: TopProductsWidget,
  search: SearchWidget,
  funnel: FunnelWidget,
  devices: DevicesWidget,
  geo: GeoWidget,
  traffic: TrafficWidget,
  live_activity: LiveActivityWidget,
  checkout: CheckoutWidget,
  wishlist: WishlistWidget,
  cart: CartWidget,
  recent_activity: RecentActivityWidget,
  ops_orders: ({ placement }) => (
    <div className={placement.collapsed ? 'opacity-60' : undefined}>
      <OpsOrdersWidget />
    </div>
  ),
  ops_customers: ({ placement }) => (
    <div className={placement.collapsed ? 'opacity-60' : undefined}>
      <OpsCustomersWidget />
    </div>
  ),
};

export function DashboardWidgetRenderer({ placement }: { placement: DashboardWidgetPlacement }) {
  const Comp = WIDGET_COMPONENTS[placement.widgetId];
  if (!Comp) {
    return (
      <WidgetFrame title={placement.widgetId}>
        <AnalyticsEmpty message="Unknown widget" />
      </WidgetFrame>
    );
  }
  return <Comp placement={placement} />;
}
