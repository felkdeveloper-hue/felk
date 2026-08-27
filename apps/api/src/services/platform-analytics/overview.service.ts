import { SessionModel, PageViewModel } from '@/models/analytics/index.js';
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
import { countUniqueVisitorIpsFromActivity } from './unique-ip.util.js';

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
    // LANDERS: every landing in period (sessions / page-view sessions / unique IPs)
    landCur,
    landPrev,
    // USERS: registered customer accounts created in period
    usersCur,
    usersPrev,
  ] = await Promise.all([
    // VISITORS: unique IPs from in-period landings (not Visitor.lastSeenAt — that
    // drops yesterday's people once they return today).
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev),
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
    SessionModel.countDocuments(sessionsTodayMatch),
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
