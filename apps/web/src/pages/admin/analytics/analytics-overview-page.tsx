import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Users, Activity, Eye, TrendingUp, Monitor } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  KpiCardWithDelta,
  KpiGridSkeleton,
  formatDuration,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useAnalyticsOverview } from '@/hooks/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';
import { ADMIN_ROUTES } from '@/constants';

export function AnalyticsOverviewPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const overview = useAnalyticsOverview(filter);

  const data = overview.data;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Analytics"
        description="Visitor behavior, sessions, and business metrics."
        actions={<AnalyticsExportButton reportType="overview" filter={filter} />}
      />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {overview.isError ? (
        <AdminErrorState message="Failed to load analytics." onRetry={() => overview.refetch()} />
      ) : overview.isLoading ? (
        <KpiGridSkeleton count={11} />
      ) : !data ? null : (
        <>
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

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-teal-500/10 to-[var(--admin-panel)] p-4">
              <Users className="h-6 w-6 shrink-0 text-teal-700" />
              <div>
                <p className="text-muted-foreground text-xs">New users today</p>
                <p className="text-lg font-semibold">{data.newUsersToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-blue-500/10 to-[var(--admin-panel)] p-4">
              <Monitor className="h-6 w-6 shrink-0 text-blue-700" />
              <div>
                <p className="text-muted-foreground text-xs">Sessions today</p>
                <p className="text-lg font-semibold">{data.sessionsToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-amber-500/10 to-[var(--admin-panel)] p-4">
              <Eye className="h-6 w-6 shrink-0 text-amber-700" />
              <div>
                <p className="text-muted-foreground text-xs">Unique visitors</p>
                <p className="text-lg font-semibold">{data.uniqueVisitors.value}</p>
              </div>
            </div>
          </div>

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
                className="flex items-center gap-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 transition-colors hover:border-teal-500/40 hover:bg-teal-500/5"
              >
                <Icon className="h-5 w-5 text-teal-700" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageMotion>
  );
}
