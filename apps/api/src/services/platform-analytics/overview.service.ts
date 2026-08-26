import { VisitorModel, SessionModel, PageViewModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildVisitorMatch,
  buildSessionMatch,
  buildPageViewMatch,
} from './analytics-query.builder.js';
import {
  resolveDateRange,
  getComparisonRange,
  getPctChange,
  formatPeriodLabel,
} from './date-range.util.js';

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
 * LANDERS ≈ Meta "landing page views": every time someone opens the site.
 * Prefer sessions; fall back to entry page-views / any page-view sessions when
 * in-app browsers die before a session row is written.
 */
async function countLandingEvents(
  sessionMatch: Record<string, unknown>,
  pageMatch: Record<string, unknown>,
): Promise<number> {
  const [sessions, entryViews, pageViewSessions] = await Promise.all([
    SessionModel.countDocuments(sessionMatch),
    PageViewModel.countDocuments({ ...pageMatch, isEntry: true }),
    PageViewModel.distinct('sessionId', pageMatch).then((ids) => ids.length),
  ]);
  return Math.max(sessions, entryViews, pageViewSessions);
}

/** Unique IPs in match (fallback visitorId when ipHash missing). */
async function countUniqueVisitorIps(match: Record<string, unknown>): Promise<number> {
  const rows = await VisitorModel.aggregate<{ n: number }>([
    { $match: match },
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
      },
    },
    { $count: 'n' },
  ]);
  return rows[0]?.n ?? 0;
}

async function visitorActivityMatch(
  filter: AnalyticsFilter,
  range: { from: Date; to: Date },
): Promise<Record<string, unknown>> {
  const base = await buildVisitorMatch(filter, range);
  const {
    lastSeenAt: _ignored,
    $or: searchOr,
    ...rest
  } = base as Record<string, unknown> & { lastSeenAt?: unknown; $or?: unknown };

  const dateOr = [
    { lastSeenAt: { $gte: range.from, $lte: range.to } },
    { firstSeenAt: { $gte: range.from, $lte: range.to } },
  ];

  return {
    ...rest,
    ...(Array.isArray(searchOr) ? { $and: [{ $or: searchOr }, { $or: dateOr }] } : { $or: dateOr }),
  };
}

export async function getOverview(filter: AnalyticsFilter): Promise<OverviewData> {
  const range = resolveDateRange(filter);
  const prev = getComparisonRange(range);
  const todayRange = resolveDateRange({ period: 'today' });

  const visitorCur = await visitorActivityMatch(filter, range);
  const visitorPrev = await visitorActivityMatch(filter, prev);
  const sessionCur = buildSessionMatch(filter, range);
  const sessionPrev = buildSessionMatch(filter, prev);
  const pageCur = buildPageViewMatch(filter, range);
  const pagePrev = buildPageViewMatch(filter, prev);

  const activeCutoff = new Date(Date.now() - 2 * 60 * 1000);

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
    // LANDERS: every landing in period (sessions / page-view sessions / unique IPs)
    landCur,
    landPrev,
    // USERS: registered customer accounts created in period
    usersCur,
    usersPrev,
  ] = await Promise.all([
    countUniqueVisitorIps(visitorCur),
    countUniqueVisitorIps(visitorPrev),
    VisitorModel.countDocuments({ ...visitorCur, userId: { $ne: null } }),
    VisitorModel.countDocuments({ ...visitorPrev, userId: { $ne: null } }),
    countUniqueVisitorIps({ ...visitorCur, isReturning: true }),
    countUniqueVisitorIps({ ...visitorPrev, isReturning: true }),
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
    SessionModel.countDocuments({ lastActiveAt: { $gte: activeCutoff } }),
    // Real user/guest accounts created today (Colombo), not visitor cookies.
    UserModel.countDocuments({
      isDeleted: false,
      createdAt: { $gte: todayRange.from, $lte: todayRange.to },
    }),
    SessionModel.countDocuments({
      startedAt: { $gte: todayRange.from, $lte: todayRange.to },
    }),
    countLandingEvents(sessionCur, pageCur),
    countLandingEvents(sessionPrev, pagePrev),
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
