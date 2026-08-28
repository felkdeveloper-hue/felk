import { logger } from '@/config/logger.js';
import { appConfig } from '@/config/app.config.js';
import { MetaAdInsightModel } from '@/models/analytics/meta-ad-insight.model.js';
import { MetaAdsSyncStateModel } from '@/models/analytics/meta-ads-sync-state.model.js';
import {
  fetchMetaAdInsights,
  isMetaMarketingConfigured,
  type MetaInsightRow,
} from '@/services/analytics/meta-marketing-api.service.js';
import {
  ANALYTICS_TIMEZONE,
  resolveDateRange,
} from '@/services/platform-analytics/date-range.util.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';

function calendarDateInTz(date: Date, timeZone = ANALYTICS_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  if (year == null || month == null || day == null) return ymd;
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

function ymdRangeInclusive(from: Date, to: Date): { since: string; until: string } {
  return {
    since: calendarDateInTz(from),
    until: calendarDateInTz(to),
  };
}

async function upsertInsightRows(accountId: string, rows: MetaInsightRow[]): Promise<number> {
  if (!rows.length) return 0;
  const syncedAt = new Date();
  const ops = rows.map((row) => ({
    updateOne: {
      filter: {
        accountId,
        metricDate: row.dateStart,
        level: 'ad' as const,
        campaignId: row.campaignId,
        adsetId: row.adsetId,
        adId: row.adId,
      },
      update: {
        $set: {
          accountId,
          metricDate: row.dateStart,
          level: 'ad' as const,
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          adsetId: row.adsetId,
          adsetName: row.adsetName,
          adId: row.adId,
          adName: row.adName,
          reach: row.reach,
          impressions: row.impressions,
          linkClicks: row.linkClicks,
          outboundClicks: row.outboundClicks,
          landingPageViews: row.landingPageViews,
          spend: row.spend,
          cpc: row.cpc,
          cpm: row.cpm,
          ctr: row.ctr,
          currency: row.currency,
          syncedAt,
          rawActions: row.rawActions,
        },
      },
      upsert: true,
    },
  }));

  const result = await MetaAdInsightModel.bulkWrite(ops, { ordered: false });
  return (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
}

export interface MetaAdsSyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  accountId?: string;
  since?: string;
  until?: string;
  rowsUpserted?: number;
  error?: string;
}

/**
 * Incremental sync: pull insights for [since, until] and upsert by natural key.
 * Does not invent metrics when Meta returns empty — empty means no spend that day.
 */
export async function syncMetaAdsInsights(opts?: {
  since?: string;
  until?: string;
  /** Re-fetch recent days even if already synced (Meta adjusts attribution). */
  recentDays?: number;
}): Promise<MetaAdsSyncResult> {
  if (!isMetaMarketingConfigured()) {
    return { ok: false, skipped: true, reason: 'Meta Marketing API not configured' };
  }

  const accountId = appConfig.analytics.metaAds.adAccountId!;
  const today = calendarDateInTz(new Date());
  const recentDays = opts?.recentDays ?? 3;
  const until = opts?.until ?? today;
  const since = opts?.since ?? addDaysYmd(today, -(Math.max(recentDays, 1) - 1));

  const running = await MetaAdsSyncStateModel.findOneAndUpdate(
    { accountId, status: { $ne: 'running' } },
    {
      $set: {
        accountId,
        status: 'running',
        lastAttemptAt: new Date(),
        lastError: null,
      },
      $setOnInsert: { accountId },
    },
    { upsert: true, new: true },
  ).catch(async () => {
    // Another sync may be running
    const current = await MetaAdsSyncStateModel.findOne({ accountId }).lean();
    if (current?.status === 'running') {
      return null;
    }
    await MetaAdsSyncStateModel.updateOne(
      { accountId },
      {
        $set: { status: 'running', lastAttemptAt: new Date(), lastError: null },
        $setOnInsert: { accountId },
      },
      { upsert: true },
    );
    return MetaAdsSyncStateModel.findOne({ accountId });
  });

  if (!running) {
    return { ok: false, skipped: true, reason: 'Sync already running', accountId };
  }

  try {
    const rows = await fetchMetaAdInsights({ since, until, accountId });
    const rowsUpserted = await upsertInsightRows(accountId, rows);

    await MetaAdsSyncStateModel.updateOne(
      { accountId },
      {
        $set: {
          status: 'success',
          lastSuccessAt: new Date(),
          lastSyncedFrom: since,
          lastSyncedTo: until,
          rowsUpserted,
          lastError: null,
        },
      },
    );

    logger.info(
      { accountId, since, until, rowsUpserted, fetched: rows.length },
      'Meta ads sync OK',
    );
    return { ok: true, accountId, since, until, rowsUpserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Meta sync error';
    await MetaAdsSyncStateModel.updateOne(
      { accountId },
      { $set: { status: 'error', lastError: message } },
    );
    logger.error({ err: message, accountId, since, until }, 'Meta ads sync failed');
    return { ok: false, accountId, since, until, error: message };
  }
}

/** Daily historical backfill window (default 30d) + always refresh last N days. */
export async function runScheduledMetaAdsSync(): Promise<MetaAdsSyncResult> {
  if (!isMetaMarketingConfigured()) {
    return { ok: false, skipped: true, reason: 'Meta Marketing API not configured' };
  }

  const today = calendarDateInTz(new Date());
  const lookback = appConfig.analytics.metaAds.syncLookbackDays;
  const since = addDaysYmd(today, -(lookback - 1));

  return syncMetaAdsInsights({ since, until: today, recentDays: 3 });
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  let any = false;
  let total = 0;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    any = true;
    total += v;
  }
  return any ? total : null;
}

/** Weighted average for rates (CPC/CPM/CTR) when spend/impressions exist. */
function weightedRate(rows: Array<{ value: number | null; weight: number | null }>): number | null {
  let wSum = 0;
  let vw = 0;
  let any = false;
  for (const r of rows) {
    if (r.value === null || r.weight === null || r.weight <= 0) continue;
    any = true;
    wSum += r.weight;
    vw += r.value * r.weight;
  }
  if (!any || wSum <= 0) return null;
  return Math.round((vw / wSum) * 10_000) / 10_000;
}

export interface MetaAdsPerformanceSummary {
  configured: boolean;
  available: boolean;
  timezone: string;
  period: { from: string; to: string };
  lastSync: {
    status: string | null;
    lastSuccessAt: string | null;
    lastAttemptAt: string | null;
    lastError: string | null;
    lastSyncedFrom: string | null;
    lastSyncedTo: string | null;
    stale: boolean;
  };
  platform: string;
  /** Aggregated totals — null fields mean Unavailable (never fabricated as 0). */
  totals: {
    reach: number | null;
    impressions: number | null;
    linkClicks: number | null;
    outboundClicks: number | null;
    landingPageViews: number | null;
    spend: number | null;
    cpc: number | null;
    cpm: number | null;
    ctr: number | null;
    currency: string | null;
  };
  campaigns: Array<{
    campaignId: string | null;
    campaignName: string | null;
    reach: number | null;
    impressions: number | null;
    linkClicks: number | null;
    outboundClicks: number | null;
    landingPageViews: number | null;
    spend: number | null;
    cpc: number | null;
    cpm: number | null;
    ctr: number | null;
  }>;
  /** Daily series for charts — genuine stored API rows only. */
  daily: Array<{
    date: string;
    reach: number | null;
    impressions: number | null;
    linkClicks: number | null;
    spend: number | null;
  }>;
  disclaimer: string;
}

export async function getMetaAdsPerformance(
  filter: AnalyticsFilter,
): Promise<MetaAdsPerformanceSummary> {
  const range = resolveDateRange(filter);
  const { since, until } = ymdRangeInclusive(range.from, range.to);
  const configured = isMetaMarketingConfigured();
  const accountId = appConfig.analytics.metaAds.adAccountId ?? '';

  const emptyTotals = {
    reach: null,
    impressions: null,
    linkClicks: null,
    outboundClicks: null,
    landingPageViews: null,
    spend: null,
    cpc: null,
    cpm: null,
    ctr: null,
    currency: null,
  };

  const syncState = accountId ? await MetaAdsSyncStateModel.findOne({ accountId }).lean() : null;

  const lastSuccessAt = syncState?.lastSuccessAt ?? null;
  const staleMs = 36 * 60 * 60 * 1000;
  const stale = !lastSuccessAt || Date.now() - lastSuccessAt.getTime() > staleMs;

  const base: MetaAdsPerformanceSummary = {
    configured,
    available: false,
    timezone: ANALYTICS_TIMEZONE,
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    lastSync: {
      status: syncState?.status ?? null,
      lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
      lastAttemptAt: syncState?.lastAttemptAt?.toISOString() ?? null,
      lastError: syncState?.lastError ?? null,
      lastSyncedFrom: syncState?.lastSyncedFrom ?? null,
      lastSyncedTo: syncState?.lastSyncedTo ?? null,
      stale,
    },
    platform: 'Facebook / Instagram',
    totals: emptyTotals,
    campaigns: [],
    daily: [],
    disclaimer:
      'Reach is the number of unique people/accounts who saw an advertisement. It is not the same as website visits.',
  };

  if (!configured || !accountId) {
    return base;
  }

  const rows = await MetaAdInsightModel.find({
    accountId,
    metricDate: { $gte: since, $lte: until },
  }).lean();

  if (!rows.length) {
    return { ...base, available: Boolean(lastSuccessAt) };
  }

  const totals = {
    reach: sumNullable(rows.map((r) => r.reach)),
    impressions: sumNullable(rows.map((r) => r.impressions)),
    linkClicks: sumNullable(rows.map((r) => r.linkClicks)),
    outboundClicks: sumNullable(rows.map((r) => r.outboundClicks)),
    landingPageViews: sumNullable(rows.map((r) => r.landingPageViews)),
    spend: sumNullable(rows.map((r) => r.spend)),
    cpc: weightedRate(rows.map((r) => ({ value: r.cpc, weight: r.linkClicks }))),
    cpm: weightedRate(rows.map((r) => ({ value: r.cpm, weight: r.impressions }))),
    ctr: weightedRate(rows.map((r) => ({ value: r.ctr, weight: r.impressions }))),
    currency: rows.find((r) => r.currency)?.currency ?? null,
  };

  // Note: summing daily reach overcounts unique people across days — Meta's
  // period-level unique reach would require a separate account-level query.
  // We label this clearly in the UI as "sum of daily reach (not unique across days)".

  const byCampaign = new Map<
    string,
    {
      campaignId: string | null;
      campaignName: string | null;
      reach: Array<number | null>;
      impressions: Array<number | null>;
      linkClicks: Array<number | null>;
      outboundClicks: Array<number | null>;
      landingPageViews: Array<number | null>;
      spend: Array<number | null>;
      cpcRows: Array<{ value: number | null; weight: number | null }>;
      cpmRows: Array<{ value: number | null; weight: number | null }>;
      ctrRows: Array<{ value: number | null; weight: number | null }>;
    }
  >();

  for (const r of rows) {
    const key = r.campaignId ?? r.campaignName ?? 'unknown';
    let bucket = byCampaign.get(key);
    if (!bucket) {
      bucket = {
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        reach: [],
        impressions: [],
        linkClicks: [],
        outboundClicks: [],
        landingPageViews: [],
        spend: [],
        cpcRows: [],
        cpmRows: [],
        ctrRows: [],
      };
      byCampaign.set(key, bucket);
    }
    bucket.reach.push(r.reach);
    bucket.impressions.push(r.impressions);
    bucket.linkClicks.push(r.linkClicks);
    bucket.outboundClicks.push(r.outboundClicks);
    bucket.landingPageViews.push(r.landingPageViews);
    bucket.spend.push(r.spend);
    bucket.cpcRows.push({ value: r.cpc, weight: r.linkClicks });
    bucket.cpmRows.push({ value: r.cpm, weight: r.impressions });
    bucket.ctrRows.push({ value: r.ctr, weight: r.impressions });
  }

  const campaigns = [...byCampaign.values()]
    .map((b) => ({
      campaignId: b.campaignId,
      campaignName: b.campaignName,
      reach: sumNullable(b.reach),
      impressions: sumNullable(b.impressions),
      linkClicks: sumNullable(b.linkClicks),
      outboundClicks: sumNullable(b.outboundClicks),
      landingPageViews: sumNullable(b.landingPageViews),
      spend: sumNullable(b.spend),
      cpc: weightedRate(b.cpcRows),
      cpm: weightedRate(b.cpmRows),
      ctr: weightedRate(b.ctrRows),
    }))
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));

  const byDay = new Map<
    string,
    {
      reach: Array<number | null>;
      impressions: Array<number | null>;
      linkClicks: Array<number | null>;
      spend: Array<number | null>;
    }
  >();
  for (const r of rows) {
    let day = byDay.get(r.metricDate);
    if (!day) {
      day = { reach: [], impressions: [], linkClicks: [], spend: [] };
      byDay.set(r.metricDate, day);
    }
    day.reach.push(r.reach);
    day.impressions.push(r.impressions);
    day.linkClicks.push(r.linkClicks);
    day.spend.push(r.spend);
  }

  const daily = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      reach: sumNullable(d.reach),
      impressions: sumNullable(d.impressions),
      linkClicks: sumNullable(d.linkClicks),
      spend: sumNullable(d.spend),
    }));

  return {
    ...base,
    available: true,
    totals,
    campaigns,
    daily,
  };
}

export interface AdsReconciliationReport {
  timezone: string;
  period: { from: string; to: string };
  website: {
    facebookAdsUniqueVisitors: number;
    instagramAdsUniqueVisitors: number;
    metaAdsUniqueVisitorsTotal: number;
  };
  meta: {
    available: boolean;
    reach: number | null;
    impressions: number | null;
    linkClicks: number | null;
    landingPageViews: number | null;
    outboundClicks: number | null;
    spend: number | null;
  };
  notes: string[];
  /** Large gap flag — informational only; numbers still genuine. */
  flags: string[];
}

export async function getAdsReconciliation(
  filter: AnalyticsFilter,
): Promise<AdsReconciliationReport> {
  const { getTrafficSources } = await import('@/services/platform-analytics/traffic.service.js');
  const sources = await getTrafficSources(filter);
  const meta = await getMetaAdsPerformance(filter);

  const fb =
    sources.find((s) => s.label === 'Facebook Ads')?.uniqueVisitors ??
    sources.find((s) => s.label === 'Facebook Ads')?.count ??
    0;
  const ig =
    sources.find((s) => s.label === 'Instagram Ads')?.uniqueVisitors ??
    sources.find((s) => s.label === 'Instagram Ads')?.count ??
    0;

  const websiteTotal = fb + ig;
  const linkClicks = meta.totals.linkClicks;
  const lpv = meta.totals.landingPageViews;
  const flags: string[] = [];

  if (linkClicks !== null && linkClicks > 0 && websiteTotal > 0) {
    const ratio = websiteTotal / linkClicks;
    if (ratio < 0.2 || ratio > 3) {
      flags.push(
        `Website Meta-ad visitors (${websiteTotal}) vs Meta link clicks (${linkClicks}) differ by more than expected — investigate attribution, blockers, or sync freshness.`,
      );
    }
  }

  return {
    timezone: ANALYTICS_TIMEZONE,
    period: meta.period,
    website: {
      facebookAdsUniqueVisitors: fb,
      instagramAdsUniqueVisitors: ig,
      metaAdsUniqueVisitorsTotal: websiteTotal,
    },
    meta: {
      available: meta.available,
      reach: meta.totals.reach,
      impressions: meta.totals.impressions,
      linkClicks: meta.totals.linkClicks,
      landingPageViews: meta.totals.landingPageViews,
      outboundClicks: meta.totals.outboundClicks,
      spend: meta.totals.spend,
    },
    notes: [
      'Website visits = unique browsers attributed via our first-party tracking (UTM / fbclid / in-app).',
      'Meta Reach = unique accounts who saw ads (Advertising API). Not website visits.',
      'Meta Link Clicks / Landing Page Views come from Meta measurement and will not match our site counts exactly.',
      'Differences are expected due to ad blockers, consent, redirects, attribution windows, and timezone alignment.',
      `Reporting timezone: ${ANALYTICS_TIMEZONE}.`,
      ...(lpv === null && meta.available
        ? ['Meta Landing Page Views unavailable for this account/period.']
        : []),
    ],
    flags,
  };
}
