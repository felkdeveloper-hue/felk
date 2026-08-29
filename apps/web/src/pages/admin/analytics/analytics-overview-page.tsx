import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Users, Activity, Eye, TrendingUp, Monitor, MousePointerClick, Info } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  KpiCardWithDelta,
  KpiGridSkeleton,
  formatDuration,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import { useAnalyticsOverview } from '@/hooks/admin';
import type { AnalyticsFilter, KpiMetric } from '@/services/sdk/admin';
import { ADMIN_ROUTES } from '@/constants';
import { formatAnalyticsPeriodLabel, withPeriodHint } from '@/lib/analytics-period-label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const EMPTY_KPI: KpiMetric = { value: 0, prev: 0, pctChange: 0 };

function kpi(metric?: KpiMetric | null): KpiMetric {
  return metric ?? EMPTY_KPI;
}

/** Landers = sessions/landings (independent of unique-IP visitors). Old APIs without landers fall back to visitors. */
function resolveLanders(landers: KpiMetric | undefined, visitors: KpiMetric): KpiMetric {
  return landers ?? visitors;
}

export function AnalyticsOverviewPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>({ period: '7d' });
  const overview = useAnalyticsOverview(filter);

  const data = overview.data;
  const periodLabel = data?.periodLabel || formatAnalyticsPeriodLabel(filter);
  const visitors = kpi(data?.totalVisitors);
  const landers = resolveLanders(data?.landers, visitors);
  const users = kpi(data?.totalUsers);
  const loggedIn = kpi(data?.loggedInUsers);

  return (
    <PageMotion>
      <AdminPageHeader
        title="Analytics"
        description={`Visitor behavior, sessions, and business metrics · showing ${periodLabel}.`}
        actions={<AnalyticsExportButton reportType="overview" filter={filter} />}
      />

      <AnalyticsFilterBar filter={filter} onChange={(f) => setFilter((p) => ({ ...p, ...f }))} />

      {overview.isError ? (
        <AdminErrorState
          message={
            overview.error &&
            typeof overview.error === 'object' &&
            'status' in overview.error &&
            (overview.error as { status?: number }).status === 404
              ? 'Analytics API is missing on the server (404). Deploy/restart the API on EC2, then try again.'
              : 'Failed to load analytics.'
          }
          onRetry={() => overview.refetch()}
        />
      ) : overview.isLoading ? (
        <KpiGridSkeleton count={11} />
      ) : !data ? null : (
        <TooltipProvider delayDuration={200}>
          <>
            {/* ── Primary audience funnel: LANDERS → VISITORS → USERS ── */}
            <div className="mt-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-b from-[var(--admin-panel)] to-[var(--admin-bg)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Audience Funnel</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                    <p className="font-semibold">Why LANDERS &gt; VISITORS &gt; USERS?</p>
                    <p className="mt-1">
                      <strong>LANDERS</strong> counts every session (same as Meta's "landing page
                      views"). The same person can land multiple times across different sessions —
                      from ads, links, or direct visits.
                    </p>
                    <p className="mt-1">
                      <strong>VISITORS</strong> deduplicates by IP address, so one person = one
                      count regardless of how many times they visit. This matches what Meta calls
                      "reach".
                    </p>
                    <p className="mt-1">
                      <strong>USERS</strong> are people who took the extra step to create an account
                      with their email during this period.
                    </p>
                    <p className="mt-2 text-amber-400">
                      Meta's number is usually higher because it counts every ad-triggered page
                      load, while our tracker requires JavaScript to fully load before recording.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* LANDERS */}
                <div className="relative flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-purple-500/10 to-[var(--admin-panel)] p-4">
                  <MousePointerClick className="h-7 w-7 shrink-0 text-purple-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                      LANDERS
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          Total sessions started in this period. Each time someone opens your site =
                          1 lander, even if it's the same person visiting again. Matches Meta
                          "landing page views".
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tabular-nums">
                      {landers.value.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      Total landings · {periodLabel}
                    </p>
                    {landers.pctChange !== 0 && (
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${landers.pctChange > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {landers.pctChange > 0 ? '+' : ''}
                        {landers.pctChange.toFixed(1)}% vs prev period
                      </p>
                    )}
                  </div>
                </div>

                {/* VISITORS */}
                <div className="relative flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-teal-500/10 to-[var(--admin-panel)] p-4">
                  <Eye className="h-7 w-7 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                      VISITORS
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          Unique people counted by IP address. One person visiting 10 times = 1
                          visitor. Closest to Meta "reach". Lower than LANDERS because it removes
                          repeat visits.
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tabular-nums">
                      {visitors.value.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      1 per IP/device · no admin · {periodLabel}
                    </p>
                    {visitors.pctChange !== 0 && (
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${visitors.pctChange > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {visitors.pctChange > 0 ? '+' : ''}
                        {visitors.pctChange.toFixed(1)}% vs prev period
                      </p>
                    )}
                  </div>
                </div>

                {/* USERS */}
                <div className="relative flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-blue-500/10 to-[var(--admin-panel)] p-4">
                  <Users className="h-7 w-7 shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                      USERS
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          Registered accounts created with an email address in this period. These
                          are visitors who took the step to sign up. Logged-in sessions:{' '}
                          {loggedIn.value.toLocaleString()} total.
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tabular-nums">
                      {users.value.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      New sign-ups · {periodLabel}
                    </p>
                    {users.pctChange !== 0 && (
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${users.pctChange > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {users.pctChange > 0 ? '+' : ''}
                        {users.pctChange.toFixed(1)}% vs prev period
                      </p>
                    )}
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {loggedIn.value} logged-in sessions
                    </p>
                  </div>
                </div>
              </div>

              {/* Funnel arrow indicator */}
              <div className="text-[var(--admin-ink)]/50 mt-3 flex items-center justify-center gap-2 text-[10px]">
                <span className="font-medium">{landers.value.toLocaleString()} landings</span>
                <span>→</span>
                <span className="font-medium">{visitors.value.toLocaleString()} unique people</span>
                <span>→</span>
                <span className="font-medium">{users.value.toLocaleString()} signed up</span>
                {landers.value > 0 && (
                  <span className="ml-2 rounded bg-[var(--admin-line)] px-1.5 py-0.5 font-semibold">
                    {Math.round((users.value / landers.value) * 100 * 10) / 10}% conversion
                  </span>
                )}
              </div>
            </div>

            {/* ── Standard KPI row ── */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCardWithDelta
                title="Total Page Views"
                metric={data.totalPageViews}
                hint={withPeriodHint('All page views recorded', periodLabel)}
              />
              <KpiCardWithDelta
                title="Returning Visitors"
                metric={data.returningVisitors}
                hint={withPeriodHint('Unique IPs with prior visits', periodLabel)}
              />
              <KpiCardWithDelta
                title="Avg Session Duration"
                metric={data.avgSessionDurationMs}
                format={formatDuration}
                hint={withPeriodHint('Average session length', periodLabel)}
              />
              <KpiCardWithDelta
                title="Bounce Rate"
                metric={data.bounceRate}
                format={(v) => `${v}%`}
                hint={withPeriodHint('Single-page sessions', periodLabel)}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-teal-500/10 to-[var(--admin-panel)] p-4">
                <Users className="h-6 w-6 shrink-0 text-teal-700" />
                <div>
                  <p className="text-muted-foreground text-xs">New accounts today</p>
                  <p className="text-lg font-semibold">{data.newUsersToday}</p>
                  <p className="text-muted-foreground text-[10px]">Email sign-ups (LK time)</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-blue-500/10 to-[var(--admin-panel)] p-4">
                <Monitor className="h-6 w-6 shrink-0 text-blue-700" />
                <div>
                  <p className="text-muted-foreground text-xs">Sessions today</p>
                  <p className="text-lg font-semibold">{data.sessionsToday}</p>
                  <p className="text-muted-foreground text-[10px]">Landings today (LK time)</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-[var(--admin-line)] bg-gradient-to-br from-amber-500/10 to-[var(--admin-panel)] p-4">
                <KpiCardWithDelta
                  title="Avg Pages / Session"
                  metric={data.avgPagesPerSession}
                  format={(v) => v.toFixed(1)}
                  hint={withPeriodHint('Pages browsed per session', periodLabel)}
                />
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
        </TooltipProvider>
      )}
    </PageMotion>
  );
}
