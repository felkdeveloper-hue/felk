import { Types } from 'mongoose';
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

/** Drop cookies that belong to staff/admin accounts (never count as shoppers). */
export async function excludeStaffVisitorIds(
  visitorIds: string[],
  staffIds: Types.ObjectId[],
): Promise<string[]> {
  if (visitorIds.length === 0 || staffIds.length === 0) return visitorIds;
  const staffVids = await VisitorModel.distinct('visitorId', {
    visitorId: { $in: visitorIds },
    userId: { $in: staffIds },
  });
  if (staffVids.length === 0) return visitorIds;
  const blocked = new Set(staffVids.filter((id): id is string => typeof id === 'string'));
  return visitorIds.filter((id) => !blocked.has(id));
}

/**
 * Count unique people for the selected day/period.
 *
 * Rules:
 * - Same public IP ⇒ 1 (refresh / many tabs / many landings still 1)
 * - Same device cookie (visitorId) ⇒ 1 when IP unknown
 * - Staff/admin-linked cookies are removed before counting
 * - Next calendar day/period ⇒ can count again (activity date filter)
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

  // Guest cookies with activity but no Visitor/ipHash yet — still 1 per cookie.
  // Refresh keeps the same cookie ⇒ same key ⇒ still 1.
  if (!hasExtra) {
    for (const id of visitorIds) {
      if (!found.has(id)) keys.add(`v:${id}`);
    }
  }

  return keys.size;
}

/** Unique IPs/devices among in-period activity (staff cookies removed). */
export async function countUniqueVisitorIpsFromActivity(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
  visitorExtra: Record<string, unknown> = {},
  eventMatch?: Record<string, unknown>,
  staffIds: Types.ObjectId[] = [],
): Promise<number> {
  const rawIds = await resolveActiveVisitorIds(pageMatch, sessionMatch, eventMatch);
  const visitorIds = await excludeStaffVisitorIds(rawIds, staffIds);
  return countUniqueIpsForVisitorIds(visitorIds, visitorExtra);
}
