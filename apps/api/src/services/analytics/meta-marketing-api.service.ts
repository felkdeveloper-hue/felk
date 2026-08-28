import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { fetchWithRetry, HttpRetryError } from '@/utils/http-retry.js';

const GRAPH_API_VERSION = 'v19.0';

export interface MetaInsightRow {
  dateStart: string;
  dateStop: string;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
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
  rawActions: unknown;
}

interface MetaAction {
  action_type?: string;
  value?: string | number;
}

interface MetaInsightsApiRow {
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  reach?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  inline_link_clicks?: string | number;
  outbound_clicks?: MetaAction[];
  actions?: MetaAction[];
  spend?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  ctr?: string | number;
  account_currency?: string;
}

interface MetaInsightsResponse {
  data?: MetaInsightsApiRow[];
  paging?: { next?: string; cursors?: { after?: string } };
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function actionValue(actions: MetaAction[] | undefined, types: string[]): number | null {
  if (!Array.isArray(actions) || !actions.length) return null;
  let found = false;
  let sum = 0;
  for (const a of actions) {
    const t = a.action_type ?? '';
    if (!types.includes(t)) continue;
    const v = parseNullableNumber(a.value);
    if (v === null) continue;
    found = true;
    sum += v;
  }
  return found ? sum : null;
}

export function normalizeMetaInsightRow(row: MetaInsightsApiRow): MetaInsightRow {
  const actions = row.actions;
  const outbound = row.outbound_clicks;

  // Prefer inline_link_clicks; fall back to link_click action; then generic clicks.
  const linkFromAction = actionValue(actions, ['link_click']);
  const inline = parseNullableNumber(row.inline_link_clicks);
  const clicks = parseNullableNumber(row.clicks);
  const linkClicks = inline ?? linkFromAction ?? clicks;

  return {
    dateStart: row.date_start ?? '',
    dateStop: row.date_stop ?? row.date_start ?? '',
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? null,
    adsetId: row.adset_id ?? null,
    adsetName: row.adset_name ?? null,
    adId: row.ad_id ?? null,
    adName: row.ad_name ?? null,
    reach: parseNullableNumber(row.reach),
    impressions: parseNullableNumber(row.impressions),
    linkClicks,
    outboundClicks:
      actionValue(outbound, ['outbound_click']) ?? actionValue(actions, ['outbound_click']),
    landingPageViews: actionValue(actions, ['landing_page_view', 'omni_landing_page_view']),
    spend: parseNullableNumber(row.spend),
    cpc: parseNullableNumber(row.cpc),
    cpm: parseNullableNumber(row.cpm),
    ctr: parseNullableNumber(row.ctr),
    currency: row.account_currency ?? null,
    rawActions: actions ?? null,
  };
}

function actPath(accountId: string): string {
  const id = accountId.replace(/^act_/, '');
  return `act_${id}`;
}

export function isMetaMarketingConfigured(): boolean {
  return Boolean(appConfig.analytics.metaAds.configured);
}

/**
 * Fetch daily ad-level insights from the Meta Marketing API.
 * Credentials stay server-side; never call from the browser.
 */
export async function fetchMetaAdInsights(opts: {
  since: string; // YYYY-MM-DD
  until: string;
  accountId?: string;
}): Promise<MetaInsightRow[]> {
  const cfg = appConfig.analytics.metaAds;
  if (!cfg.configured || !cfg.token || !cfg.adAccountId) {
    throw new Error('Meta Marketing API is not configured');
  }

  const accountId = opts.accountId ?? cfg.adAccountId;
  const fields = [
    'date_start',
    'date_stop',
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'reach',
    'impressions',
    'clicks',
    'inline_link_clicks',
    'outbound_clicks',
    'actions',
    'spend',
    'cpc',
    'cpm',
    'ctr',
    'account_currency',
  ].join(',');

  const timeRange = JSON.stringify({ since: opts.since, until: opts.until });
  const params = new URLSearchParams({
    access_token: cfg.token,
    fields,
    level: 'ad',
    time_increment: '1',
    time_range: timeRange,
    limit: '500',
  });

  let url: string | null =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${actPath(accountId)}/insights?${params}`;

  const rows: MetaInsightRow[] = [];
  let page = 0;
  const maxPages = 40;

  while (url && page < maxPages) {
    page += 1;
    let data: MetaInsightsResponse;
    try {
      const result = await fetchWithRetry<MetaInsightsResponse>(
        url,
        { method: 'GET' },
        { maxAttempts: 3, timeoutMs: 30_000, baseDelayMs: 1_000 },
      );
      data = result.data;
    } catch (err) {
      if (err instanceof HttpRetryError) {
        logger.error(
          { status: err.lastStatus, attempts: err.attempts, since: opts.since, until: opts.until },
          'Meta Marketing API request failed',
        );
      }
      throw err;
    }

    if (data.error?.message) {
      logger.error(
        { code: data.error.code, type: data.error.type, since: opts.since, until: opts.until },
        `Meta Marketing API error: ${data.error.message}`,
      );
      throw new Error(`Meta Marketing API: ${data.error.message}`);
    }

    for (const raw of data.data ?? []) {
      const normalized = normalizeMetaInsightRow(raw);
      if (normalized.dateStart) rows.push(normalized);
    }

    url = data.paging?.next ?? null;
    if (url) {
      // Mild pacing between pages to respect rate limits
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return rows;
}
