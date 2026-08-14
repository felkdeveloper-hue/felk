import { VisitorModel, SessionModel, PageViewModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildVisitorMatch,
  buildSessionMatch,
  buildPageViewMatch,
} from './analytics-query.builder.js';
import { resolveDateRange, getComparisonRange, getPctChange } from './date-range.util.js';

export interface KpiMetric {
  value: number;
  prev: number;
  pctChange: number;
}

export interface OverviewData {
  period: { from: Date; to: Date };
  totalVisitors: KpiMetric;
  uniqueVisitors: KpiMetric;
  loggedInUsers: KpiMetric;
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

export async function getOverview(filter: AnalyticsFilter): Promise<OverviewData> {
  const range = resolveDateRange(filter);
  const prev = getComparisonRange(range);

  const visitorCur = await buildVisitorMatch(filter, range);
  const visitorPrev = await buildVisitorMatch(filter, prev);
  const sessionCur = buildSessionMatch(filter, range);
  const sessionPrev = buildSessionMatch(filter, prev);
  const pageCur = buildPageViewMatch(filter, range);
  const pagePrev = buildPageViewMatch(filter, prev);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Keep in sync with live.service ACTIVE_WINDOW_MS (2 minutes of recent activity)
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
  ] = await Promise.all([
    VisitorModel.countDocuments(visitorCur),
    VisitorModel.countDocuments(visitorPrev),
    VisitorModel.countDocuments({ ...visitorCur, userId: { $ne: null } }),
    VisitorModel.countDocuments({ ...visitorPrev, userId: { $ne: null } }),
    VisitorModel.countDocuments({ ...visitorCur, isReturning: true }),
    VisitorModel.countDocuments({ ...visitorPrev, isReturning: true }),
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
    VisitorModel.countDocuments({ firstSeenAt: { $gte: today } }),
    SessionModel.countDocuments({ startedAt: { $gte: today } }),
  ]);

  return {
    period: range,
    totalVisitors: makeMetric(tv, pvTv),
    uniqueVisitors: makeMetric(tv, pvTv),
    loggedInUsers: makeMetric(li, pvLi),
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
