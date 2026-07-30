import { Globe, Monitor, Smartphone, Tablet, RefreshCw } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import { AnalyticsEmpty } from '@/components/admin/analytics';
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
        description="Active sessions in the last 5 minutes. Refreshes every 8 seconds."
        actions={
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {visitors.length} active
            <button
              onClick={() => void query.refetch()}
              className="hover:bg-muted ml-2 rounded-md p-1"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {query.isError ? (
        <AdminErrorState message="Failed to load live visitors." onRetry={() => query.refetch()} />
      ) : visitors.length === 0 ? (
        <AnalyticsEmpty message="No active visitors right now." />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visitors.map((v) => (
            <div
              key={v.sessionId}
              className="bg-card border-border space-y-2 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DeviceIcon type={v.deviceType} />
                  <span className="text-sm font-medium capitalize">{v.deviceType}</span>
                  {v.browser && (
                    <span className="text-muted-foreground text-xs">/ {v.browser}</span>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  {v.country ?? '—'}
                </div>
              </div>

              {v.currentPage && (
                <p className="text-muted-foreground truncate font-mono text-xs">{v.currentPage}</p>
              )}

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>On site: {formatAge(v.timeOnSiteMs)}</span>
                {v.userId && <span className="text-xs text-emerald-600">Logged in</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageMotion>
  );
}
