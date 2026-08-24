import { SessionModel, VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildSessionMatch, resolveDateRange } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';

/**
 * Traffic sources for the selected period.
 *
 * Counts **sessions** (visits), not lifetime customers:
 * - Non-direct (ads / social / search): every session in the period counts
 *   (same person returning from an ad/social/search link again increases the number).
 * - Direct: unique IPs (same person typing the URL again does not inflate Direct).
 *
 * Session attribution prefers the visitor's first-touch source when it is
 * non-direct, so a returning Instagram visitor is not re-labeled Direct.
 */
export async function getTrafficSources(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const sessionMatch = buildSessionMatch(filter, range);

  const sessions = await SessionModel.find(sessionMatch)
    .select('sessionId visitorId trafficSource')
    .lean();

  if (!sessions.length) return [];

  const visitorIds = [...new Set(sessions.map((s) => s.visitorId).filter(Boolean))];
  const visitors = visitorIds.length
    ? await VisitorModel.find({ visitorId: { $in: visitorIds } })
        .select(
          'visitorId ipHash trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource',
        )
        .lean()
    : [];

  const visitorById = new Map(visitors.map((v) => [v.visitorId, v] as const));

  const merged = new Map<
    string,
    { source: string; label: string; channel: string; keys: Set<string> }
  >();

  for (const session of sessions) {
    const visitor = session.visitorId ? visitorById.get(session.visitorId) : undefined;
    const attribution = formatAttribution({
      trafficSource: visitor?.trafficSource || session.trafficSource || 'direct',
      referrer: visitor?.referrer ?? null,
      utmSource: visitor?.utmSource ?? null,
      utmMedium: visitor?.utmMedium ?? null,
      utmCampaign: visitor?.utmCampaign ?? null,
      utmContent: visitor?.utmContent ?? null,
      fbclid: visitor?.fbclid ?? null,
      gclid: visitor?.gclid ?? null,
      ttclid: visitor?.ttclid ?? null,
      msclkid: visitor?.msclkid ?? null,
      igshid: visitor?.igshid ?? null,
      inAppSource: visitor?.inAppSource ?? null,
    });

    const isDirect = attribution.label === 'Direct';
    const key = isDirect
      ? visitor?.ipHash && visitor.ipHash !== 'unknown'
        ? `ip:${visitor.ipHash}`
        : `s:${session.sessionId}`
      : `s:${session.sessionId}`;

    const existing = merged.get(attribution.label);
    if (existing) {
      existing.keys.add(key);
    } else {
      merged.set(attribution.label, {
        source: visitor?.trafficSource || session.trafficSource || 'direct',
        label: attribution.label,
        channel: attribution.channel,
        keys: new Set([key]),
      });
    }
  }

  const ranked = [...merged.values()]
    .map((row) => ({
      source: row.source,
      label: row.label,
      channel: row.channel,
      count: row.keys.size,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = ranked.reduce((sum, row) => sum + row.count, 0);

  return ranked.map((row) => ({
    ...row,
    pct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
  }));
}
