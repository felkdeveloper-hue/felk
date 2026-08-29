import { SessionModel, PageViewModel, EventModel, VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildSessionMatch, buildPageViewMatch } from './analytics-query.builder.js';
import {
  resolveDateRange,
  getComparisonRange,
  getPctChange,
  formatPeriodLabel,
} from './date-range.util.js';
import { excludeAdminAudience, resolveStaffUserIds } from './admin-traffic.util.js';
import { countUniqueVisitorIpsFromActivity, uniqueIpKey } from './unique-ip.util.js';

export interface KpiMetric {
  value: number;
  prev: number;
  pctChange: number;
}

export interface OverviewData {
  period: { from: Date; to: Date };
  periodLabel: string;
  /** Total sessions started in period — equivalent to Meta "landing page views". */
  landers: KpiMetric;
  /** Unique IPs that visited in period. */
  totalVisitors: KpiMetric;
  uniqueVisitors: KpiMetric;
  /** Visitor docs linked to a registered account. */
  loggedInUsers: KpiMetric;
  /** Registered customer accounts created in period. */
  totalUsers: KpiMetric;
  newUsersToday: number;
  returningVisitors: KpiMetric;
  activeNow: number;
  sessionsToday: number;
  avgSessionDurationMs: KpiMetric;
  bounceRate: KpiMetric;
  totalPageViews: KpiMetric;
  avgPagesPerSession: KpiMetric;
}

function makeMetric(current: number, previous: number): KpiMetric {
  return { value: current, prev: previous, pctChange: getPctChange(current, previous) };
}

/**
 * LANDERS ≈ Meta "landing page views" / GA4 sessions:
 * sessions ∪ entry page-views ∪ distinct page-view sessions ∪ distinct event sessions.
 * Events matter when page-view ingest was dropping (e.g. long SEO titles failing Zod).
 */
async function countLandingEvents(
  sessionMatch: Record<string, unknown>,
  pageMatch: Record<string, unknown>,
  eventMatch: Record<string, unknown>,
): Promise<number> {
  const [sessions, entryViews, pageViewSessions, eventSessions] = await Promise.all([
    SessionModel.countDocuments(sessionMatch),
    PageViewModel.countDocuments({ ...pageMatch, isEntry: true }),
    PageViewModel.distinct('sessionId', pageMatch).then((ids) => ids.length),
    EventModel.distinct('sessionId', {
      ...eventMatch,
      sessionId: { $type: 'string' },
    }).then((ids) => ids.length),
  ]);
  return Math.max(sessions, entryViews, pageViewSessions, eventSessions);
}

/** Unique IPs from visitors active via page/session OR events OR lastSeen in range. */
async function countVisitorsWithFallbacks(
  pageMatch: Record<string, unknown>,
  sessionMatch: Record<string, unknown>,
  eventMatch: Record<string, unknown>,
  range: { from: Date; to: Date },
  staffIds: import('mongoose').Types.ObjectId[],
): Promise<number> {
  const fromActivity = await countUniqueVisitorIpsFromActivity(pageMatch, sessionMatch);

  const eventVisitorIds = (await EventModel.distinct('visitorId', {
    ...eventMatch,
    visitorId: { $type: 'string' },
  })) as string[];

  const visitorSeenMatch = excludeAdminAudience(
    {
      $or: [
        { lastSeenAt: { $gte: range.from, $lte: range.to } },
        { firstSeenAt: { $gte: range.from, $lte: range.to } },
      ],
    },
    staffIds,
    'landingPath',
  );
  const seenVisitors = await VisitorModel.find(visitorSeenMatch, {
    visitorId: 1,
    ipHash: 1,
  }).lean();

  const keys = new Set<string>();

  // Re-resolve activity count via the util already applied; also merge event + seen.
  if (fromActivity > 0 && eventVisitorIds.length === 0 && seenVisitors.length === 0) {
    return fromActivity;
  }

  const activityIds = await PageViewModel.distinct('visitorId', pageMatch);
  const sessionIds = await SessionModel.distinct('visitorId', sessionMatch);
  const allIds = [
    ...new Set(
      [
        ...activityIds,
        ...sessionIds,
        ...eventVisitorIds,
        ...seenVisitors.map((v) => v.visitorId),
      ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  if (allIds.length === 0) return fromActivity;

  const visitors = await VisitorModel.find(
    { visitorId: { $in: allIds } },
    { visitorId: 1, ipHash: 1 },
  ).lean();
  const found = new Set<string>();
  for (const v of visitors) {
    found.add(v.visitorId);
    keys.add(uniqueIpKey(v.ipHash, v.visitorId));
  }
  for (const id of allIds) {
    if (!found.has(id)) keys.add(`v:${id}`);
  }

  return Math.max(keys.size, fromActivity);
}

export async function getOverview(filter: AnalyticsFilter): Promise<OverviewData> {
  const range = resolveDateRange(filter);
  const prev = getComparisonRange(range);
  const todayRange = resolveDateRange({ period: 'today' });

  // Staff/admin + /admin path traffic must not inflate Meta-style landers/visitors.
  const staffIds = await resolveStaffUserIds();

  const sessionCur = excludeAdminAudience(buildSessionMatch(filter, range), staffIds, 'entryPage');
  const sessionPrev = excludeAdminAudience(buildSessionMatch(filter, prev), staffIds, 'entryPage');
  const pageCur = excludeAdminAudience(buildPageViewMatch(filter, range), staffIds, 'path');
  const pagePrev = excludeAdminAudience(buildPageViewMatch(filter, prev), staffIds, 'path');
  const eventCur = excludeAdminAudience(
    { occurredAt: { $gte: range.from, $lte: range.to } },
    staffIds,
    'path',
  );
  const eventPrev = excludeAdminAudience(
    { occurredAt: { $gte: prev.from, $lte: prev.to } },
    staffIds,
    'path',
  );

  const activeCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const activeMatch = excludeAdminAudience(
    { lastActiveAt: { $gte: activeCutoff } },
    staffIds,
    'entryPage',
  );
  const sessionsTodayMatch = excludeAdminAudience(
    {
      startedAt: { $gte: todayRange.from, $lte: todayRange.to },
    },
    staffIds,
    'entryPage',
  );

  const [
    tv,
    pvTv,
    li,
    pvLi,
    ret,
    pvRet,
    dur,
    pvDur,
    br,
    pvBr,
    pv,
    pvPv,
    ap,
    pvAp,
    activeNow,
    newToday,
    sToday,
    // LANDERS: every landing in period (sessions / page-view sessions / event sessions)
    landCur,
    landPrev,
    // USERS: registered customer accounts created in period
    usersCur,
    usersPrev,
  ] = await Promise.all([
    // VISITORS: unique IPs from landings + events + visitor lastSeen (GA4-style resilience)
    countVisitorsWithFallbacks(pageCur, sessionCur, eventCur, range, staffIds),
    countVisitorsWithFallbacks(pagePrev, sessionPrev, eventPrev, prev, staffIds),
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur, { userId: { $ne: null } }),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev, { userId: { $ne: null } }),
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur, { isReturning: true }),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev, { isReturning: true }),
    SessionModel.aggregate<{ avg: number }>([
      { $match: { ...sessionCur, durationMs: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' } } },
    ]).then((r) => Math.round(r[0]?.avg ?? 0)),
    SessionModel.aggregate<{ avg: number }>([
      { $match: { ...sessionPrev, durationMs: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' } } },
    ]).then((r) => Math.round(r[0]?.avg ?? 0)),
    SessionModel.countDocuments(sessionCur).then(async (total) => {
      if (!total) return 0;
      const bounces = await SessionModel.countDocuments({ ...sessionCur, isBounce: true });
      return Math.round((bounces / total) * 100 * 10) / 10;
    }),
    SessionModel.countDocuments(sessionPrev).then(async (total) => {
      if (!total) return 0;
      const bounces = await SessionModel.countDocuments({ ...sessionPrev, isBounce: true });
      return Math.round((bounces / total) * 100 * 10) / 10;
    }),
    PageViewModel.countDocuments(pageCur),
    PageViewModel.countDocuments(pagePrev),
    SessionModel.aggregate<{ avg: number }>([
      { $match: sessionCur },
      { $group: { _id: null, avg: { $avg: '$pageCount' } } },
    ]).then((r) => Math.round((r[0]?.avg ?? 1) * 10) / 10),
    SessionModel.aggregate<{ avg: number }>([
      { $match: sessionPrev },
      { $group: { _id: null, avg: { $avg: '$pageCount' } } },
    ]).then((r) => Math.round((r[0]?.avg ?? 1) * 10) / 10),
    SessionModel.countDocuments(activeMatch),
    // Real user/guest accounts created today (Colombo), not visitor cookies.
    UserModel.countDocuments({
      isDeleted: false,
      createdAt: { $gte: todayRange.from, $lte: todayRange.to },
    }),
    SessionModel.countDocuments(sessionsTodayMatch).then(async (n) => {
      if (n > 0) return n;
      // Fallback: distinct event sessions today when session rows were not written
      const todayEvents = excludeAdminAudience(
        {
          occurredAt: { $gte: todayRange.from, $lte: todayRange.to },
          sessionId: { $type: 'string' },
        },
        staffIds,
        'path',
      );
      return EventModel.distinct('sessionId', todayEvents).then((ids) => ids.length);
    }),
    countLandingEvents(sessionCur, pageCur, eventCur),
    countLandingEvents(sessionPrev, pagePrev, eventPrev),
    // Customer accounts created in period
    UserModel.countDocuments({
      isDeleted: false,
      roleKey: 'customer',
      createdAt: { $gte: range.from, $lte: range.to },
    }),
    UserModel.countDocuments({
      isDeleted: false,
      roleKey: 'customer',
      createdAt: { $gte: prev.from, $lte: prev.to },
    }),
  ]);

  return {
    period: range,
    periodLabel: formatPeriodLabel(filter),
    landers: makeMetric(Math.max(landCur, tv), Math.max(landPrev, pvTv)),
    totalVisitors: makeMetric(tv, pvTv),
    uniqueVisitors: makeMetric(tv, pvTv),
    loggedInUsers: makeMetric(li, pvLi),
    totalUsers: makeMetric(usersCur, usersPrev),
    newUsersToday: newToday,
    returningVisitors: makeMetric(ret, pvRet),
    activeNow,
    sessionsToday: sToday,
    avgSessionDurationMs: makeMetric(dur, pvDur),
    bounceRate: makeMetric(br, pvBr),
    totalPageViews: makeMetric(pv, pvPv),
    avgPagesPerSession: makeMetric(ap, pvAp),
  };
}
