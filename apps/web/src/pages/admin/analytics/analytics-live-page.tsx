import { Globe, Monitor, Smartphone, Tablet, RefreshCw } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import { AnalyticsEmpty, AnalyticsExportButton } from '@/components/admin/analytics';
import { useLiveVisitors } from '@/hooks/admin';

function DeviceIcon({ type }: { type: string }) {
  if (type === 'mobile') return <Smartphone className="text-muted-foreground h-4 w-4" />;
  if (type === 'tablet') return <Tablet className="text-muted-foreground h-4 w-4" />;
  return <Monitor className="text-muted-foreground h-4 w-4" />;
}

function formatAge(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h`;
}

export function AnalyticsLivePage() {
  const query = useLiveVisitors();
  const visitors = query.data ?? [];

  return (
    <PageMotion>
      <AdminPageHeader
        title="Live Visitors"
        description="Anyone active in the last 2 minutes. Refreshes every 8 seconds."
        actions={
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <AnalyticsExportButton reportType="activity" filter={{ period: 'today' }} />
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="relative flex h-2 w-2">
                {visitors.length > 0 ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-400" />
                )}
              </span>
              <span className="font-semibold tabular-nums text-[var(--admin-ink)]">
                {visitors.length}
              </span>
              active
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="hover:bg-muted ml-1 rounded-md p-1.5"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        }
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load live visitors." onRetry={() => query.refetch()} />
      ) : visitors.length === 0 ? (
        <AnalyticsEmpty message="No active visitors right now. Open the storefront on your phone to see Live update." />
      ) : (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {visitors.map((v) => {
            const ageMs = Date.now() - new Date(v.lastActiveAt).getTime();
            return (
              <div
                key={v.sessionId}
                className="bg-card border-border space-y-2.5 rounded-2xl border p-3.5 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <DeviceIcon type={v.deviceType} />
                    <span className="text-sm font-medium capitalize">{v.deviceType}</span>
                    {v.browser && (
                      <span className="text-muted-foreground truncate text-xs">/ {v.browser}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                    <Globe className="h-3.5 w-3.5" />
                    {v.country ?? '—'}
                  </div>
                </div>

                {v.currentPage && (
                  <p className="bg-muted/50 truncate rounded-lg px-2 py-1.5 font-mono text-xs text-[var(--admin-ink)]">
                    {v.currentPage}
                  </p>
                )}

                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>On site {formatAge(v.timeOnSiteMs)}</span>
                  <span>Seen {formatAge(ageMs)} ago</span>
                </div>
                {v.userId ? (
                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Logged in
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </PageMotion>
  );
}
