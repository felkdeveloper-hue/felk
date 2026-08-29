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
 * Count unique people (devices) among visitorIds that landed in the period.
 *
 * Rule (product requirement):
 * - Same public IP ⇒ count 1 for the selected day/period
 * - Different IP ⇒ count again
 * - Next calendar period ⇒ count again (date filter is on activity, not lifetime)
 *
 * Formula: |{ uniqueIpKey(ipHash, visitorId) for each active visitorId }|
 * - Prefer ipHash from VisitorModel when present
 * - If no Visitor row / no ipHash yet, still count the browser cookie (visitorId)
 *   so event-only traffic is not dropped (common when visitor upsert lagged)
 * - When `visitorExtra` is set (e.g. isReturning), only matching Visitor docs count
 *   (orphans cannot satisfy those filters)
 */
export async function countUniqueIpsForVisitorIds(
  visitorIds: string[],
  visitorExtra: Record<string, unknown> = {},
): Promise<number> {
  if (visitorIds.length === 0) return 0;

  const hasExtra = Object.keys(visitorExtra).length > 0;
  const visitors = await VisitorModel.find(
    { visitorId: { $in: visitorIds }, ...visitorExtra },
    { visitorId: 1, ipHash: 1 },
  ).lean();

  const keys = new Set<string>();
  const found = new Set<string>();
  for (const v of visitors) {
    found.add(v.visitorId);
    keys.add(uniqueIpKey(v.ipHash, v.visitorId));
  }

  // Guest/device cookies with activity but no Visitor/ipHash yet still count as 1 person.
  if (!hasExtra) {
    for (const id of visitorIds) {
      if (!found.has(id)) keys.add(`v:${id}`);
    }
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
