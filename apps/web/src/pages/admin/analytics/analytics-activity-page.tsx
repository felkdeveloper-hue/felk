import { useEffect, useState } from 'react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsEmpty,
  AnalyticsFilterBar,
  AnalyticsExportButton,
  TableSkeleton,
} from '@/components/admin/analytics';
import { useActivityFeed, useLiveVisitors, useAnalyticsFilters } from '@/hooks/admin';
import type { ActivityFeedItem } from '@/services/sdk/admin';
import { connectAnalyticsSocket } from '@/lib/analytics/live-socket';
import { useAuthStore } from '@/store';

function relativeTime(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec} sec ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function AnalyticsActivityPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: {} });
  const feedQuery = useActivityFeed();
  const live = useLiveVisitors();
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [online, setOnline] = useState(0);
  const [socketLive, setSocketLive] = useState(false);

  const visibleItems = items.filter((item) => {
    if (filter.eventName && item.name !== filter.eventName) return false;
    return true;
  });

  useEffect(() => {
    if (feedQuery.data) setItems(feedQuery.data);
  }, [feedQuery.data]);

  useEffect(() => {
    setOnline(live.data?.length ?? 0);
  }, [live.data]);

  useEffect(() => {
    if (!token) return;
    const disconnect = connectAnalyticsSocket({
      token,
      onActivity: (item) => {
        setSocketLive(true);
        setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 80));
      },
      onOnline: (count) => {
        setSocketLive(true);
        setOnline(count);
      },
    });
    return disconnect;
  }, [token]);

  return (
    <PageMotion>
      <AdminPageHeader
        title="Real-Time Activity"
        description="Live customer actions across the storefront."
        actions={
          <div className="flex items-center gap-4">
            <AnalyticsExportButton reportType="activity" filter={filter} />
            <div className="text-sm">
              <span className="font-semibold tabular-nums">{online}</span>{' '}
              <span className="text-muted-foreground">online</span>
              <span className="text-muted-foreground ml-3 text-xs">
                {socketLive ? 'Socket connected' : 'Polling fallback'}
              </span>
            </div>
          </div>
        }
      />

      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        onClear={clearFilters}
        visible={['eventName', 'device', 'country']}
      />

      {feedQuery.isError && !items.length ? (
        <AdminErrorState message="Failed to load activity." onRetry={() => feedQuery.refetch()} />
      ) : feedQuery.isLoading && !items.length ? (
        <TableSkeleton />
      ) : !visibleItems.length ? (
        <AnalyticsEmpty />
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {visibleItems.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                {item.path ? (
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">{item.path}</p>
                ) : null}
              </div>
              <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {relativeTime(item.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </PageMotion>
  );
}
