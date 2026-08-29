import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildPageViewMatch,
  buildSessionMatch,
  buildVisitorMatch,
  resolveDateRange,
} from './analytics-query.builder.js';
import { excludeAdminAudience, resolveStaffUserIds } from './admin-traffic.util.js';
import { resolveActiveVisitorIds } from './unique-ip.util.js';
import { anonymizeIp } from './geoip.util.js';
import { formatAttribution } from './source-attribution.util.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

/**
 * Visitors list: **one row per unique IP** in the selected period.
 *
 * - Today / single day: each distinct IP that landed that day counts once
 *   (account or guest does not matter).
 * - 7D / 30D / multi-day: still one row per IP across the whole range
 *   (same IP returning on later days does not inflate the multi-day total).
 * - Same IP on a *new* calendar day increases that day's Today count.
 *
 * Activity is taken from page views ∪ sessions in-range (not Visitor.lastSeenAt),
 * so a return visit on a later day does not erase prior-day landings.
 */
export async function getVisitors(filter: AnalyticsFilter) {
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;
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
  // Same activity set as Overview visitors (page ∪ session ∪ event visitorIds → unique IP).
  const activeIds = await resolveActiveVisitorIds(pageMatch, sessionMatch, eventMatch);

  const base = await buildVisitorMatch(filter, range);
  // Drop lastSeenAt window — membership comes from in-period landings above.
  const {
    lastSeenAt: _ignored,
    $or: searchOr,
    ...rest
  } = base as Record<string, unknown> & { lastSeenAt?: unknown; $or?: unknown };

  const match: Record<string, unknown> = {
    ...rest,
    visitorId: { $in: activeIds.length ? activeIds : ['__none__'] },
    ...(Array.isArray(searchOr) ? { $or: searchOr } : {}),
  };
  // Staff-linked visitor rows (if any survived activity filters) stay out of the list.
  const audienceMatch = excludeAdminAudience(match, staffIds, 'landingPath');

  const grouped = await VisitorModel.aggregate<{
    _id: string;
    doc: Record<string, unknown>;
  }>([
    { $match: audienceMatch },
    { $sort: { lastSeenAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [
            {
              $and: [
                { $ne: ['$ipHash', null] },
                { $ne: ['$ipHash', ''] },
                { $ne: ['$ipHash', 'unknown'] },
              ],
            },
            { $concat: ['ip:', '$ipHash'] },
            { $concat: ['v:', '$visitorId'] },
          ],
        },
        doc: { $first: '$$ROOT' },
      },
    },
    { $sort: { 'doc.lastSeenAt': -1 } },
  ]);

  // Users who logged in this period with a real IP but no matching visitor row
  // (e.g. source recovered on user only) — still one slot per IP.
  const seenKeys = new Set(grouped.map((row) => row._id));
  const users = await UserModel.find({
    isDeleted: false,
    lastLoginAt: { $gte: range.from, $lte: range.to },
    lastLoginIp: { $exists: true, $nin: [null, ''] },
  })
    .select(
      'email firstName lastName lastLoginAt lastLoginIp lastLoginCountry lastLoginDevice metadata.acquisition',
    )
    .lean();

  type Synthetic = {
    _id: string;
    doc: Record<string, unknown>;
    syntheticUser?: (typeof users)[number];
  };

  const extras: Synthetic[] = [];
  for (const user of users) {
    const ipHash = hashIp(user.lastLoginIp as string | null | undefined);
    const key = ipHash ? `ip:${ipHash}` : `u:${String(user._id)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const acq = (user.metadata as Record<string, unknown> | undefined)?.acquisition as
      | {
          sourceLabel?: string | null;
          sourceChannel?: string | null;
          sourceDetail?: string | null;
          trafficSource?: string | null;
          utmSource?: string | null;
          utmMedium?: string | null;
          utmCampaign?: string | null;
          fbclid?: string | null;
        }
      | undefined;

    extras.push({
      _id: key,
      syntheticUser: user,
      doc: {
        _id: String(user._id),
        visitorId: `user:${String(user._id)}`,
        userId: user._id,
        ipHash: ipHash ?? 'unknown',
        geo: {
          country: null,
          countryCode: null,
          region: null,
          city: null,
        },
        device: {
          type:
            user.lastLoginDevice === 'Phone'
              ? 'mobile'
              : user.lastLoginDevice === 'Desktop'
                ? 'desktop'
                : user.lastLoginDevice === 'Tablet'
                  ? 'tablet'
                  : 'unknown',
          browser: null,
        },
        trafficSource: acq?.trafficSource ?? 'direct',
        referrer: null,
        utmSource: acq?.utmSource ?? null,
        utmMedium: acq?.utmMedium ?? null,
        utmCampaign: acq?.utmCampaign ?? null,
        utmContent: null,
        fbclid: acq?.fbclid ?? null,
        gclid: null,
        ttclid: null,
        msclkid: null,
        igshid: null,
        inAppSource: null,
        firstSeenAt: user.lastLoginAt,
        lastSeenAt: user.lastLoginAt,
        totalVisits: 1,
        totalSessions: 1,
        isReturning: false,
        _acqLabel: acq?.sourceLabel ?? null,
        _acqChannel: acq?.sourceChannel ?? null,
        _acqDetail: acq?.sourceDetail ?? null,
        _loginCountry: user.lastLoginCountry ?? null,
      },
    });
  }

  const allRows = [...grouped.map((row) => ({ _id: row._id, doc: row.doc })), ...extras].sort(
    (a, b) => {
      const aTime = new Date(a.doc.lastSeenAt as Date).getTime();
      const bTime = new Date(b.doc.lastSeenAt as Date).getTime();
      return bTime - aTime;
    },
  );

  const total = allRows.length;
  const pageRows = allRows.slice(skip, skip + limit);

  const userIds = [
    ...new Set(
      pageRows
        .map((row) => (row.doc.userId ? String(row.doc.userId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const linkedUsers =
    userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .select('email firstName lastName')
          .lean()
      : [];

  const userById = new Map(
    linkedUsers.map((user) => [
      String(user._id),
      {
        email: user.email as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
      },
    ]),
  );

  const enriched = pageRows.map((row) => {
    const raw = row.doc;
    const user = raw.userId ? userById.get(String(raw.userId)) : undefined;
    const firstName = user?.firstName?.trim() ?? '';
    const lastName = user?.lastName?.trim() ?? '';
    const normalizedLast =
      lastName && lastName.toLowerCase() !== firstName.toLowerCase() ? lastName : '';
    const customerName =
      firstName || normalizedLast
        ? [firstName, normalizedLast].filter(Boolean).join(' ')
        : (user?.email ?? null);

    const acqLabel = raw._acqLabel as string | null | undefined;
    const attribution = acqLabel
      ? {
          label: acqLabel,
          channel: (raw._acqChannel as string) || '',
          detail: (raw._acqDetail as string) || undefined,
        }
      : formatAttribution({
          trafficSource: (raw.trafficSource as string) || 'direct',
          referrer: raw.referrer as string | null,
          utmSource: raw.utmSource as string | null,
          utmMedium: raw.utmMedium as string | null,
          utmCampaign: raw.utmCampaign as string | null,
          utmContent: raw.utmContent as string | null,
          fbclid: raw.fbclid as string | null,
          gclid: raw.gclid as string | null,
          ttclid: raw.ttclid as string | null,
          msclkid: raw.msclkid as string | null,
          igshid: raw.igshid as string | null,
          inAppSource: raw.inAppSource as string | null,
        });

    const loginCountry = raw._loginCountry as string | null | undefined;
    const geo = (raw.geo as Record<string, unknown>) || {};
    if (loginCountry && !geo.country && !geo.city) {
      // Keep raw string in country for display when only lastLoginCountry exists.
      geo.country = loginCountry;
    }

    return {
      ...raw,
      geo,
      customerName,
      customerEmail: user?.email ?? null,
      sourceLabel: attribution.label,
      sourceChannel: attribution.channel,
      sourceDetail: attribution.detail ?? null,
    };
  });

  return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
}
