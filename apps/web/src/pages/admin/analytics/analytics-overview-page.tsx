import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Users, Activity, Eye, Clock, TrendingUp, Monitor } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  KpiCardWithDelta,
  AnalyticsChartCard,
  KpiGridSkeleton,
  ChartSkeleton,
  formatDuration,
} from '@/components/admin/analytics';
import { useAnalyticsOverview, useLiveVisitors } from '@/hooks/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';
import { ADMIN_ROUTES } from '@/constants';

export function AnalyticsOverviewPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const overview = useAnalyticsOverview(filter);
  const live = useLiveVisitors();

  const data = overview.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Analytics"
        description="Visitor behavior, sessions, and business metrics."
        actions={
          <Link
            to={ADMIN_ROUTES.analyticsLive}
            className="admin-btn admin-btn-primary inline-flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Live ({live.data?.length ?? 0})
          </Link>
        }
      />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {overview.isError ? (
        <AdminErrorState message="Failed to load analytics." onRetry={() => overview.refetch()} />
      ) : overview.isLoading ? (
        <KpiGridSkeleton count={11} />
      ) : !data ? null : (
        <>
          {/* KPI grid */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCardWithDelta
              title="Total Visitors"
              metric={data.totalVisitors}
              hint="Unique visitor IDs"
            />
            <KpiCardWithDelta
              title="Logged-in Users"
              metric={data.loggedInUsers}
              hint="Authenticated sessions"
            />
            <KpiCardWithDelta title="Returning Visitors" metric={data.returningVisitors} />
            <KpiCardWithDelta title="Total Page Views" metric={data.totalPageViews} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCardWithDelta
              title="Avg Session Duration"
              metric={data.avgSessionDurationMs}
              format={formatDuration}
            />
            <KpiCardWithDelta
              title="Bounce Rate"
              metric={data.bounceRate}
              format={(v) => `${v}%`}
            />
            <KpiCardWithDelta
              title="Avg Pages / Session"
              metric={data.avgPagesPerSession}
              format={(v) => v.toFixed(1)}
            />

            {/* Non-comparative single-value cards */}
            <div className="bg-card border-border rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Active Now
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{data.activeNow}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-muted-foreground text-xs">Live right now</span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="bg-card border-border flex items-center gap-4 rounded-xl border p-4">
              <Users className="text-primary h-6 w-6 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">New users today</p>
                <p className="text-lg font-semibold">{data.newUsersToday}</p>
              </div>
            </div>
            <div className="bg-card border-border flex items-center gap-4 rounded-xl border p-4">
              <Monitor className="text-primary h-6 w-6 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Sessions today</p>
                <p className="text-lg font-semibold">{data.sessionsToday}</p>
              </div>
            </div>
            <div className="bg-card border-border flex items-center gap-4 rounded-xl border p-4">
              <Eye className="text-primary h-6 w-6 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Unique visitors</p>
                <p className="text-lg font-semibold">{data.uniqueVisitors.value}</p>
              </div>
            </div>
          </div>

          {/* Quick links to sub-sections */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Visitors', to: ADMIN_ROUTES.analyticsVisitors, icon: Users },
              { label: 'Events', to: ADMIN_ROUTES.analyticsEvents, icon: Activity },
              { label: 'Devices', to: ADMIN_ROUTES.analyticsDevices, icon: Monitor },
              { label: 'Traffic Sources', to: ADMIN_ROUTES.analyticsTraffic, icon: TrendingUp },
            ].map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="bg-card border-border hover:border-primary/40 hover:bg-primary/5 flex items-center gap-3 rounded-xl border p-4 transition-colors"
              >
                <Icon className="text-muted-foreground h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageMotion>
  );
}
