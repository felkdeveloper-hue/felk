import { PageViewModel, SessionModel, VisitorModel } from '@/models/analytics/index.js';

/** Unique-IP key: prefer ipHash, else visitorId (when hash missing/unknown). */
export function uniqueIpKey(ipHash: string | null | undefined, visitorId: string): string {
  if (ipHash && ipHash !== 'unknown') return `ip:${ipHash}`;
  return `v:${visitorId}`;
}

/**
 * Distinct shopper visitorIds that landed in-period (page views ∪ sessions).
 * Prefer this over Visitor.lastSeenAt — a return visit today must not erase yesterday.
 */
export async function resolveActiveVisitorIds(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
): Promise<string[]> {
  const [pageIds, sessionIds] = await Promise.all([
    PageViewModel.distinct('visitorId', pageMatch),
    SessionModel.distinct('visitorId', sessionMatch),
  ]);
  return [
    ...new Set(
      [...pageIds, ...sessionIds].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    ),
  ];
}

/**
 * Count unique IPs among visitorIds that landed in the period.
 * Orphan page-view visitorIds (no visitor row yet) count as `v:{id}` unless
 * `visitorExtra` filters require a visitor document (e.g. isReturning / userId).
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

  if (!hasExtra) {
    for (const id of visitorIds) {
      if (!found.has(id)) keys.add(`v:${id}`);
    }
  }

  return keys.size;
}

/** Unique IPs (or visitorId fallback) that landed under the given activity matches. */
export async function countUniqueVisitorIpsFromActivity(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
  visitorExtra: Record<string, unknown> = {},
): Promise<number> {
  const visitorIds = await resolveActiveVisitorIds(pageMatch, sessionMatch);
  return countUniqueIpsForVisitorIds(visitorIds, visitorExtra);
}
