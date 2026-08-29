import { VisitorModel, SessionModel, PageViewModel, EventModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildPageViewMatch,
  buildSessionMatch,
  buildVisitorMatch,
  resolveDateRange,
  type MongoMatch,
} from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';
import { ANALYTICS_TIMEZONE } from './date-range.util.js';
import { excludeAdminAudience, resolveStaffUserIds } from './admin-traffic.util.js';
import { resolveActiveVisitorIds, uniqueIpKey } from './unique-ip.util.js';

type SourceRow = {
  source: string;
  label: string;
  channel: string;
  /** Unique visitor keys (ip: / v: / u:) */
  visitorKeys: Set<string>;
  visitorIds: Set<string>;
};

export type TrafficSourceResult = {
  source: string;
  label: string;
  channel: string;
  /** @deprecated Prefer uniqueVisitors — kept for backward-compatible dashboards/widgets. */
  count: number;
  /** Unique IPs (ipHash) attributed to this source in the period. */
  uniqueVisitors: number;
  /** Sessions attributed to visitors in this source for the period. */
  visits: number;
  /** Page views from those visitors in the period. */
  pageViews: number;
  pct: number;
  metric: 'website_unique_visitors';
};

/**
 * Traffic sources for the selected period — first-party website tracking only.
 *
 * Formula (reconciles with Overview unique visitors):
 * 1. Active visitorIds = page views ∪ sessions ∪ events in period (admin-excluded).
 * 2. Load VisitorModel rows for those IDs (trafficSource / UTM / click ids).
 * 3. Group by formatAttribution; uniqueVisitors = |uniqueIpKey(ipHash, visitorId)|.
 * 4. Do not filter to firstSeenAt-only or non-direct lastSeen — that undercounted
 *    returning IPs (Overview hundreds vs Traffic ~9).
 *
 * These numbers are NOT Meta Reach / Impressions / Ad Manager metrics.
 */
export async function getTrafficSources(filter: AnalyticsFilter): Promise<TrafficSourceResult[]> {
  const range = resolveDateRange(filter);
  const staffIds = await resolveStaffUserIds();

  const pageMatch = excludeAdminAudience(buildPageViewMatch(filter, range), staffIds, 'path');
  const sessionMatch = excludeAdminAudience(
    buildSessionMatch(filter, range),
    staffIds,
    'entryPage',
  );
  const eventMatch = excludeAdminAudience(
    { occurredAt: { $gte: range.from, $lte: range.to } },
    staffIds,
    'path',
  );

  const activeIds = await resolveActiveVisitorIds(pageMatch, sessionMatch, eventMatch);

  // Dimension filters from visitor match (country/device/q/source) — drop date window;
  // membership is activity-based above, same as Overview visitors.
  const base = await buildVisitorMatch(filter, range);
  const {
    lastSeenAt: _ignored,
    $or: searchOr,
    ...rest
  } = base as MongoMatch & {
    lastSeenAt?: unknown;
    $or?: unknown;
  };

  const match: MongoMatch = {
    ...rest,
    visitorId: { $in: activeIds.length ? activeIds : ['__none__'] },
    ...(Array.isArray(searchOr) ? { $or: searchOr } : {}),
  };
  const audienceMatch = excludeAdminAudience(match, staffIds, 'landingPath');

  const visitors = await VisitorModel.find(audienceMatch)
    .select(
      'visitorId ipHash trafficSource utmSource utmMedium utmCampaign referrer inAppSource fbclid gclid ttclid',
    )
    .lean();

  const merged = new Map<string, SourceRow>();

  for (const v of visitors) {
    const attribution = formatAttribution({
      trafficSource: v.trafficSource || 'direct',
      utmSource: v.utmSource || null,
      utmMedium: v.utmMedium || null,
      utmCampaign: v.utmCampaign || null,
      referrer: v.referrer || null,
      inAppSource: v.inAppSource || null,
      fbclid: v.fbclid || null,
      gclid: v.gclid || null,
      ttclid: v.ttclid || null,
    });
    const ipKey = uniqueIpKey(v.ipHash, v.visitorId);
    const existing = merged.get(attribution.label);
    if (existing) {
      existing.visitorKeys.add(ipKey);
      existing.visitorIds.add(v.visitorId);
    } else {
      merged.set(attribution.label, {
        source: v.trafficSource || 'direct',
        label: attribution.label,
        channel: attribution.channel,
        visitorKeys: new Set([ipKey]),
        visitorIds: new Set([v.visitorId]),
      });
    }
  }

  // Users / guests who show a real source in Admin → Users but whose visitor
  // row is missing or Direct: add them from saved acquisition (real data only).
  const users = await UserModel.find({
    isDeleted: false,
    lastLoginAt: { $gte: range.from, $lte: range.to },
    'metadata.acquisition.sourceLabel': {
      $exists: true,
      $nin: [null, '', 'Direct', 'Unknown'],
    },
  })
    .select('metadata.acquisition')
    .lean();

  for (const user of users) {
    const acq = (user.metadata as Record<string, unknown> | undefined)?.acquisition as
      | {
          sourceLabel?: string | null;
          sourceChannel?: string | null;
          trafficSource?: string | null;
          visitorId?: string | null;
        }
      | undefined;
    const label = acq?.sourceLabel?.trim();
    if (!label || label === 'Direct' || label === 'Unknown') continue;

    const key = acq?.visitorId ? `v:${acq.visitorId}` : `u:${String(user._id)}`;
    const existing = merged.get(label);
    if (existing) {
      existing.visitorKeys.add(key);
      if (acq?.visitorId) existing.visitorIds.add(acq.visitorId);
    } else {
      merged.set(label, {
        source: acq?.trafficSource || 'paid_social',
        label,
        channel: acq?.sourceChannel || '',
        visitorKeys: new Set([key]),
        visitorIds: new Set(acq?.visitorId ? [acq.visitorId] : []),
      });
    }
  }

  const allVisitorIds = [...new Set([...merged.values()].flatMap((r) => [...r.visitorIds]))];

  const sessionCounts = new Map<string, number>();
  const pageViewCounts = new Map<string, number>();
  const eventSessionCounts = new Map<string, number>();

  if (allVisitorIds.length) {
    const [sessions, pageViews, eventSessions] = await Promise.all([
      SessionModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            visitorId: { $in: allVisitorIds },
            startedAt: { $gte: range.from, $lte: range.to },
          },
        },
        { $group: { _id: '$visitorId', count: { $sum: 1 } } },
      ]),
      PageViewModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            visitorId: { $in: allVisitorIds },
            viewedAt: { $gte: range.from, $lte: range.to },
          },
        },
        { $group: { _id: '$visitorId', count: { $sum: 1 } } },
      ]),
      // Visit fallback when session docs are sparse but events carried sessionId.
      EventModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            visitorId: { $in: allVisitorIds },
            occurredAt: { $gte: range.from, $lte: range.to },
            sessionId: { $type: 'string' },
          },
        },
        { $group: { _id: '$visitorId', sessions: { $addToSet: '$sessionId' } } },
        { $project: { count: { $size: '$sessions' } } },
      ]),
    ]);
    for (const s of sessions) sessionCounts.set(s._id, s.count);
    for (const p of pageViews) pageViewCounts.set(p._id, p.count);
    for (const e of eventSessions) eventSessionCounts.set(e._id, e.count);
  }

  const ranked = [...merged.values()]
    .map((row) => {
      let visits = 0;
      let pageViews = 0;
      for (const vid of row.visitorIds) {
        const sess = sessionCounts.get(vid) ?? 0;
        const evSess = eventSessionCounts.get(vid) ?? 0;
        visits += Math.max(sess, evSess);
        pageViews += pageViewCounts.get(vid) ?? 0;
      }
      const uniqueVisitors = row.visitorKeys.size;
      if (visits === 0 && uniqueVisitors > 0) visits = uniqueVisitors;

      return {
        source: row.source,
        label: row.label,
        channel: row.channel,
        uniqueVisitors,
        visits,
        pageViews,
        count: uniqueVisitors,
        metric: 'website_unique_visitors' as const,
      };
    })
    .filter((row) => row.uniqueVisitors > 0)
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);

  const total = ranked.reduce((sum, row) => sum + row.uniqueVisitors, 0);

  return ranked.map((row) => ({
    ...row,
    pct: total > 0 ? Math.round((row.uniqueVisitors / total) * 1000) / 10 : 0,
  }));
}

export function getTrafficTimezone(): string {
  return ANALYTICS_TIMEZONE;
}
