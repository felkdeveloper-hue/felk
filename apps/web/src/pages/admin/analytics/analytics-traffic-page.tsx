import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { RefreshCw, Info } from 'lucide-react';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import {
  AnalyticsFilterBar,
  AnalyticsBreadcrumbs,
  AnalyticsChartCard,
  AnalyticsEmpty,
  ChartSkeleton,
  AnalyticsExportButton,
} from '@/components/admin/analytics';
import {
  useTrafficSources,
  useMetaAdsPerformance,
  useAdsReconciliation,
  useAnalyticsFilters,
  useAnalyticsDrillDown,
  analyticsKeys,
} from '@/hooks/admin';
import { ADMIN_CHART_COLORS, adminChartColor } from '@/lib/admin-chart-colors';
import { formatAnalyticsPeriodLabel } from '@/lib/analytics-period-label';
import { adminAnalyticsApi } from '@/services/sdk/admin';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ADMIN_CHART_COLORS;

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unavailable';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(value: number | null | undefined, currency: string | null): string {
  if (value === null || value === undefined) return 'Unavailable';
  const prefix = currency ? `${currency} ` : '';
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AnalyticsTrafficPage() {
  const { filter, setFilter, clearFilters } = useAnalyticsFilters({ defaults: { period: '7d' } });
  const { drill, breadcrumbs, trail } = useAnalyticsDrillDown(filter);
  const query = useTrafficSources(filter);
  const metaQuery = useMetaAdsPerformance(filter);
  const reconcileQuery = useAdsReconciliation(filter);
  const queryClient = useQueryClient();
  const sources = query.data ?? [];
  const periodLabel = formatAnalyticsPeriodLabel(filter);
  const meta = metaQuery.data;
  const reconcile = reconcileQuery.data;

  const syncMutation = useMutation({
    mutationFn: () => adminAnalyticsApi.syncMetaAds(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.metaAds(filter) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.adsReconcile(filter) });
    },
  });

  return (
    <PageMotion>
      <AdminPageHeader
        title="Traffic & Ads"
        description={`Website traffic vs advertising performance · ${periodLabel} · timezone Asia/Colombo`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncMutation.isPending || meta?.configured === false}
              onClick={() => syncMutation.mutate()}
              title={
                meta?.configured === false
                  ? 'Configure META_AD_ACCOUNT_ID and META_ADS_ACCESS_TOKEN on the API'
                  : 'Refresh Meta Ads insights from the Marketing API'
              }
            >
              <RefreshCw
                className={cn('mr-1.5 h-3.5 w-3.5', syncMutation.isPending && 'animate-spin')}
              />
              Sync Meta Ads
            </Button>
            <AnalyticsExportButton
              reportType="traffic"
              filter={filter}
              drillLabel={trail.at(-1)?.label}
            />
          </div>
        }
      />

      <AnalyticsBreadcrumbs items={breadcrumbs} />
      <AnalyticsFilterBar filter={filter} onChange={setFilter} onClear={clearFilters} />

      {/* ── Website Traffic (first-party) ───────────────────────────────────── */}
      <section className="mt-6 space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Website Traffic</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            First-party tracked site visits.{' '}
            <span className="text-foreground font-medium">Unique Visitors</span> for
            ads/social/search are unique browsers; Direct uses unique IPs. These are not Meta Reach.
          </p>
        </div>

        {query.isError ? (
          <AdminErrorState message="Failed to load traffic data." onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <ChartSkeleton />
        ) : !sources.length ? (
          <AnalyticsEmpty message="No website traffic for the selected period." />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <AnalyticsChartCard
                title="Traffic distribution"
                description="Click a source to filter visitors"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart style={{ cursor: 'pointer' }}>
                    <Pie
                      data={sources}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
                      label={false}
                      labelLine={false}
                      onClick={(_, index) => {
                        const item = sources[index];
                        if (!item?.source) return;
                        drill({
                          destination: 'visitors',
                          label: `Visitors · ${item.label}`,
                          append: { trafficSource: item.source },
                        });
                      }}
                    >
                      {sources.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                      }}
                      formatter={(
                        v: unknown,
                        _name: unknown,
                        props: { payload?: { label?: string; pct?: number } },
                      ) => [
                        `${(v as number).toLocaleString()} unique visitors (${props.payload?.pct ?? 0}%)`,
                        props.payload?.label ?? 'Source',
                      ]}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) =>
                        value.length > 18 ? `${value.slice(0, 17)}…` : value
                      }
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </AnalyticsChartCard>

              <AnalyticsChartCard title="Unique visitors by source">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sources} layout="vertical" margin={{ right: 48 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      className="stroke-border"
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                      }}
                      formatter={(
                        v: unknown,
                        _name: unknown,
                        props: { payload?: { label?: string; pct?: number } },
                      ) => [
                        `${(v as number).toLocaleString()} (${props.payload?.pct ?? 0}%)`,
                        props.payload?.label ?? 'Unique visitors',
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {sources.map((_, i) => (
                        <Cell key={i} fill={adminChartColor(i)} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        formatter={(v: unknown) => (v as number).toLocaleString()}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartCard>
            </div>

            <div className="bg-card border-border overflow-hidden rounded-xl border">
              <p className="border-b border-inherit px-4 py-3 text-sm font-medium">
                Source breakdown · website tracking
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-inherit">
                      <th className="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium">
                        Source
                      </th>
                      <th
                        className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium"
                        title="Sessions attributed to visitors from this source"
                      >
                        Visits
                      </th>
                      <th
                        className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium"
                        title="Unique browsers (or unique IPs for Direct)"
                      >
                        Unique Visitors
                      </th>
                      <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                        Page Views
                      </th>
                      <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s, i) => (
                      <tr key={`${s.label}-${i}`} className="border-b border-inherit last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                            <span>{s.label}</span>
                          </div>
                          {s.channel ? (
                            <p className="text-muted-foreground ml-4 text-xs">{s.channel}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {(s.visits ?? s.count).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {(s.uniqueVisitors ?? s.count).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {(s.pageViews ?? 0).toLocaleString()}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                          {s.pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Advertising Performance (Meta API) ─────────────────────────────── */}
      <section className="mt-10 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Advertising Performance</h2>
            <p className="text-muted-foreground mt-0.5 max-w-2xl text-sm">
              {meta?.disclaimer ??
                'Reach is the number of unique people/accounts who saw an advertisement. It is not the same as website visits.'}
            </p>
          </div>
          {meta?.lastSync?.lastSuccessAt ? (
            <p className="text-muted-foreground text-xs">
              Last Meta sync:{' '}
              {new Date(meta.lastSync.lastSuccessAt).toLocaleString('en-GB', {
                timeZone: meta.timezone || 'Asia/Colombo',
              })}
              {meta.lastSync.stale ? ' · may not be current' : ''}
              {meta.lastSync.status === 'error' && meta.lastSync.lastError
                ? ` · last error: ${meta.lastSync.lastError}`
                : ''}
            </p>
          ) : null}
        </div>

        {metaQuery.isError ? (
          <AdminErrorState
            message="Failed to load Meta advertising data."
            onRetry={() => metaQuery.refetch()}
          />
        ) : metaQuery.isLoading ? (
          <ChartSkeleton />
        ) : !meta?.configured ? (
          <div className="bg-muted/40 border-border rounded-xl border px-4 py-5 text-sm">
            <p className="font-medium">Meta Marketing API not configured</p>
            <p className="text-muted-foreground mt-1">
              Set <code className="text-xs">META_AD_ACCOUNT_ID</code> and{' '}
              <code className="text-xs">META_ADS_ACCESS_TOKEN</code> (ads_read) on the API. Until
              then, advertising metrics show as Unavailable — website traffic above remains genuine
              first-party data.
            </p>
          </div>
        ) : !meta.available ? (
          <div className="bg-muted/40 border-border rounded-xl border px-4 py-5 text-sm">
            <p className="font-medium">No synced Meta insights for this period</p>
            <p className="text-muted-foreground mt-1">
              Use <span className="font-medium">Sync Meta Ads</span> to pull official insights, or
              wait for the scheduled sync. Showing Unavailable rather than fabricated zeros.
            </p>
          </div>
        ) : (
          <div className="bg-card border-border overflow-hidden rounded-xl border">
            <p className="border-b border-inherit px-4 py-3 text-sm font-medium">
              {meta.platform} · Marketing API
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-inherit">
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium">
                      Platform
                    </th>
                    <th
                      className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium"
                      title="Sum of daily reach — not unique across the full period"
                    >
                      Reach*
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      Impressions
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      Link Clicks
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      Outbound Clicks
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      Landing Page Views
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      Spend
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      CPC
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      CPM
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-xs font-medium">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-inherit">
                    <td className="px-4 py-2.5 font-medium">{meta.platform}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMetric(meta.totals.reach)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMetric(meta.totals.impressions)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMetric(meta.totals.linkClicks)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMetric(meta.totals.outboundClicks)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMetric(meta.totals.landingPageViews)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(meta.totals.spend, meta.totals.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(meta.totals.cpc, meta.totals.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(meta.totals.cpm, meta.totals.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {meta.totals.ctr === null || meta.totals.ctr === undefined
                        ? 'Unavailable'
                        : `${meta.totals.ctr.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground flex items-start gap-1.5 border-t border-inherit px-4 py-2.5 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              *Reach shown is the sum of daily reach values from stored API rows and can overcount
              unique people across days. It is still genuine Meta data — never estimated from
              website visits.
            </p>

            {meta.campaigns.length > 0 ? (
              <div className="border-t border-inherit">
                <p className="px-4 py-3 text-sm font-medium">Campaigns</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-inherit">
                        <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                          Campaign
                        </th>
                        <th className="text-muted-foreground px-4 py-2 text-right text-xs font-medium">
                          Reach*
                        </th>
                        <th className="text-muted-foreground px-4 py-2 text-right text-xs font-medium">
                          Impressions
                        </th>
                        <th className="text-muted-foreground px-4 py-2 text-right text-xs font-medium">
                          Link Clicks
                        </th>
                        <th className="text-muted-foreground px-4 py-2 text-right text-xs font-medium">
                          LPV
                        </th>
                        <th className="text-muted-foreground px-4 py-2 text-right text-xs font-medium">
                          Spend
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {meta.campaigns.slice(0, 25).map((c, i) => (
                        <tr
                          key={c.campaignId ?? i}
                          className="border-b border-inherit last:border-0"
                        >
                          <td className="px-4 py-2">{c.campaignName ?? c.campaignId ?? '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatMetric(c.reach)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatMetric(c.impressions)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatMetric(c.linkClicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatMetric(c.landingPageViews)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {formatMoney(c.spend, meta.totals.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Reconciliation ─────────────────────────────────────────────────── */}
      <section className="mt-10 space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Data reconciliation</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Compare first-party website attribution with Meta Marketing API metrics. Numbers are not
            expected to match exactly.
          </p>
        </div>

        {reconcileQuery.isLoading ? (
          <ChartSkeleton />
        ) : reconcile ? (
          <div className="bg-card border-border space-y-4 rounded-xl border px-4 py-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">
                  Website · Facebook Ads unique visitors
                </dt>
                <dd className="font-medium tabular-nums">
                  {reconcile.website.facebookAdsUniqueVisitors.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Website · Instagram Ads unique visitors
                </dt>
                <dd className="font-medium tabular-nums">
                  {reconcile.website.instagramAdsUniqueVisitors.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Meta · Link Clicks</dt>
                <dd className="font-medium tabular-nums">
                  {formatMetric(reconcile.meta.linkClicks)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Meta · Landing Page Views</dt>
                <dd className="font-medium tabular-nums">
                  {formatMetric(reconcile.meta.landingPageViews)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Meta · Reach*</dt>
                <dd className="font-medium tabular-nums">{formatMetric(reconcile.meta.reach)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Meta · Impressions</dt>
                <dd className="font-medium tabular-nums">
                  {formatMetric(reconcile.meta.impressions)}
                </dd>
              </div>
            </dl>
            {reconcile.flags.length > 0 ? (
              <ul className="border-border space-y-1 border-t pt-3 text-amber-700 dark:text-amber-400">
                {reconcile.flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
            <ul className="text-muted-foreground border-border list-disc space-y-1 border-t pl-4 pt-3 text-xs">
              {reconcile.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </PageMotion>
  );
}
