import { EventModel, PageViewModel, SessionModel, VisitorModel } from '@/models/analytics/index.js';

/** Unique-IP key: prefer ipHash, else visitorId (when hash missing/unknown). */
export function uniqueIpKey(ipHash: string | null | undefined, visitorId: string): string {
  if (ipHash && ipHash !== 'unknown') return `ip:${ipHash}`;
  return `v:${visitorId}`;
}

/**
 * Distinct shopper visitorIds that landed in-period.
 * Sources: page views ∪ sessions ∪ events (visitorId on events — never sessionId alone).
 * Prefer this over Visitor.lastSeenAt — a return visit today must not erase yesterday.
 */
export async function resolveActiveVisitorIds(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
  eventMatch?: Record<string, unknown>,
): Promise<string[]> {
  const [pageIds, sessionIds, eventIds] = await Promise.all([
    PageViewModel.distinct('visitorId', pageMatch),
    SessionModel.distinct('visitorId', sessionMatch),
    eventMatch
      ? EventModel.distinct('visitorId', {
          ...eventMatch,
          visitorId: { $type: 'string' },
        })
      : Promise.resolve([] as string[]),
  ]);
  return [
    ...new Set(
      [...pageIds, ...sessionIds, ...eventIds].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    ),
  ];
}

/**
 * Count unique IPs among visitorIds that landed in the period.
 *
 * Formula: |{ uniqueIpKey(ipHash, visitorId) for visitor docs matching visitorIds }|
 * - Prefer ipHash from VisitorModel (same IP ⇒ 1 within the period).
 * - Orphan activity visitorIds with no Visitor row are skipped (avoids inflating
 *   "visitors" by counting cookies/session proxies as people).
 * - When `visitorExtra` is set (e.g. isReturning), only matching visitor docs count.
 */
export async function countUniqueIpsForVisitorIds(
  visitorIds: string[],
  visitorExtra: Record<string, unknown> = {},
): Promise<number> {
  if (visitorIds.length === 0) return 0;

  const visitors = await VisitorModel.find(
    { visitorId: { $in: visitorIds }, ...visitorExtra },
    { visitorId: 1, ipHash: 1 },
  ).lean();

  const keys = new Set<string>();
  for (const v of visitors) {
    keys.add(uniqueIpKey(v.ipHash, v.visitorId));
  }
  return keys.size;
}

/** Unique IPs among visitorIds active via page/session/(optional) event matches. */
export async function countUniqueVisitorIpsFromActivity(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
  visitorExtra: Record<string, unknown> = {},
  eventMatch?: Record<string, unknown>,
): Promise<number> {
  const visitorIds = await resolveActiveVisitorIds(pageMatch, sessionMatch, eventMatch);
  return countUniqueIpsForVisitorIds(visitorIds, visitorExtra);
}
