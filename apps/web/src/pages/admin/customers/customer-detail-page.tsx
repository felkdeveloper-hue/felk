import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowDown } from 'lucide-react';
import { Button } from '@fe-platform/ui';
import { AdminErrorState, AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { formatDate } from '@/lib/utils';
import { customersApi } from '@/services/sdk/admin';
import { useCustomerTimeline, useSessionReplay } from '@/hooks/admin';
import type { TimelineItem } from '@/services/sdk/admin';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const rawSearch = useSearch({ strict: false }) as { tab?: string; sessionId?: string };
  const [tab, setTab] = useState<'overview' | 'activity'>(
    rawSearch.tab === 'activity' ? 'activity' : 'overview',
  );
  const [replaySessionId, setReplaySessionId] = useState<string | null>(
    typeof rawSearch.sessionId === 'string' ? rawSearch.sessionId : null,
  );

  useEffect(() => {
    if (rawSearch.tab === 'activity') setTab('activity');
    if (typeof rawSearch.sessionId === 'string' && rawSearch.sessionId) {
      setReplaySessionId(rawSearch.sessionId);
      setTab('activity');
    }
  }, [rawSearch.tab, rawSearch.sessionId]);

  const query = useQuery({
    queryKey: QUERY_KEYS.customers.detail(customerId),
    queryFn: () => customersApi.getById(customerId),
  });

  const customer = query.data;
  const timelineUserId = customer?.userId || customer?.id || '';
  const timeline = useCustomerTimeline(timelineUserId);
  const replay = useSessionReplay(replaySessionId);

  const grouped = useMemo(() => {
    const items = timeline.data ?? [];
    const map = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const day = formatDay(item.at);
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [timeline.data]);

  if (query.isError) {
    return <AdminErrorState message="Unable to load customer." onRetry={() => query.refetch()} />;
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title={
          [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ||
          customer?.email ||
          'Customer'
        }
        description={customer?.email}
        actions={
          <Link to={ADMIN_ROUTES.customers}>
            <Button variant="outline" size="sm">
              Back to customers
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-2 border-b">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
          Activity
        </TabButton>
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Profile">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Email</dt>
                <dd>{customer?.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Phone</dt>
                <dd>{customer?.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Status</dt>
                <dd>{customer?.status ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Joined</dt>
                <dd>{customer?.createdAt ? formatDate(customer.createdAt) : '—'}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel title="Addresses">
            <p className="text-sm text-neutral-600">
              Customer address book will render from the customer detail API.
            </p>
          </AdminPanel>
          <AdminPanel title="Orders">
            <p className="text-sm text-neutral-600">Recent orders filtered by customer ID.</p>
          </AdminPanel>
          <AdminPanel title="Wishlist">
            <p className="text-sm text-neutral-600">Wishlist items and staff notes.</p>
          </AdminPanel>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AdminPanel title="Activity timeline">
            {timeline.isError ? (
              <AdminErrorState
                message="Unable to load activity."
                onRetry={() => timeline.refetch()}
              />
            ) : timeline.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading timeline…</p>
            ) : !grouped.length ? (
              <p className="text-muted-foreground text-sm">No tracked activity yet.</p>
            ) : (
              <div className="space-y-6">
                {grouped.map(([day, items]) => (
                  <div key={day}>
                    <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                      {day}
                    </p>
                    <ol className="relative space-y-4 border-l pl-4">
                      {items.map((item) => (
                        <li key={item.id} className="relative">
                          <span className="bg-primary absolute -left-[21px] top-1.5 size-2.5 rounded-full" />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-medium">{item.label}</p>
                            <time className="text-muted-foreground text-xs tabular-nums">
                              {formatTime(item.at)}
                            </time>
                          </div>
                          {item.sessionId ? (
                            <button
                              type="button"
                              className="text-primary mt-1 text-xs underline-offset-2 hover:underline"
                              onClick={() => setReplaySessionId(item.sessionId!)}
                            >
                              Replay session
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="Session behavior replay">
            {!replaySessionId ? (
              <p className="text-muted-foreground text-sm">
                Select “Replay session” on a timeline event to see the chronological interaction
                steps (no video).
              </p>
            ) : replay.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading replay…</p>
            ) : replay.isError ? (
              <AdminErrorState message="Unable to load replay." onRetry={() => replay.refetch()} />
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground font-mono text-xs">
                  {replaySessionId.slice(0, 8)}…
                </p>
                {replay.data?.summary ? (
                  <dl className="text-muted-foreground mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      Device:{' '}
                      <span className="text-foreground capitalize">
                        {replay.data.summary.deviceType ?? '—'}
                      </span>
                    </div>
                    <div>
                      Browser:{' '}
                      <span className="text-foreground">{replay.data.summary.browser ?? '—'}</span>
                    </div>
                    <div>
                      Pages:{' '}
                      <span className="text-foreground">{replay.data.summary.pageCount}</span>
                    </div>
                    <div>
                      Scroll:{' '}
                      <span className="text-foreground">{replay.data.summary.maxScrollDepth}%</span>
                    </div>
                  </dl>
                ) : null}
                <div className="flex flex-col items-stretch gap-1">
                  {(replay.data?.steps ?? []).map((step, idx, arr) => (
                    <div key={step.id} className="flex flex-col items-center">
                      <div className="bg-card w-full rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span>{step.label}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatTime(step.at)}
                          </span>
                        </div>
                        {step.deltaMs != null && idx > 0 ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            +{Math.round(step.deltaMs / 1000)}s from previous
                            {step.scrollDepth != null ? ` · Scroll ${step.scrollDepth}%` : ''}
                            {step.timeOnPageMs != null
                              ? ` · ${Math.round(step.timeOnPageMs / 1000)}s on page`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                      {idx < arr.length - 1 ? (
                        <ArrowDown className="text-muted-foreground my-1 h-3.5 w-3.5" />
                      ) : null}
                    </div>
                  ))}
                </div>
                {!replay.data?.steps?.length ? (
                  <p className="text-muted-foreground text-sm">No steps in this session.</p>
                ) : null}
              </div>
            )}
          </AdminPanel>
        </div>
      )}
    </PageMotion>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-foreground text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
