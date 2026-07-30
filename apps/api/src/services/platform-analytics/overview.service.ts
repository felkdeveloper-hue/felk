import { VisitorModel, SessionModel, PageViewModel, EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
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

async function countVisitors(from: Date, to: Date) {
  return VisitorModel.countDocuments({ lastSeenAt: { $gte: from, $lte: to } });
}

async function countUniqueVisitors(from: Date, to: Date) {
  const result = await VisitorModel.distinct('visitorId', {
    lastSeenAt: { $gte: from, $lte: to },
  });
  return result.length;
}

async function countLoggedIn(from: Date, to: Date) {
  return VisitorModel.countDocuments({
    lastSeenAt: { $gte: from, $lte: to },
    userId: { $ne: null },
  });
}

async function countReturning(from: Date, to: Date) {
  return VisitorModel.countDocuments({
    lastSeenAt: { $gte: from, $lte: to },
    isReturning: true,
  });
}

async function countSessions(from: Date, to: Date) {
  return SessionModel.countDocuments({ startedAt: { $gte: from, $lte: to } });
}

async function avgDuration(from: Date, to: Date) {
  const result = await SessionModel.aggregate<{ avg: number }>([
    { $match: { startedAt: { $gte: from, $lte: to }, durationMs: { $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$durationMs' } } },
  ]);
  return Math.round(result[0]?.avg ?? 0);
}

async function bounceRatePct(from: Date, to: Date) {
  const [total, bounces] = await Promise.all([
    SessionModel.countDocuments({ startedAt: { $gte: from, $lte: to } }),
    SessionModel.countDocuments({ startedAt: { $gte: from, $lte: to }, isBounce: true }),
  ]);
  if (!total) return 0;
  return Math.round((bounces / total) * 100 * 10) / 10;
}

async function countPageViews(from: Date, to: Date) {
  return PageViewModel.countDocuments({ viewedAt: { $gte: from, $lte: to } });
}

async function avgPages(from: Date, to: Date) {
  const result = await SessionModel.aggregate<{ avg: number }>([
    { $match: { startedAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, avg: { $avg: '$pageCount' } } },
  ]);
  return Math.round((result[0]?.avg ?? 1) * 10) / 10;
}

async function countActiveNow() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 min heartbeat window
  return SessionModel.countDocuments({ isActive: true, lastActiveAt: { $gte: cutoff } });
}

async function countNewToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return VisitorModel.countDocuments({ firstSeenAt: { $gte: today } });
}

async function sessionsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return SessionModel.countDocuments({ startedAt: { $gte: today } });
}

function makeMetric(current: number, previous: number): KpiMetric {
  return { value: current, prev: previous, pctChange: getPctChange(current, previous) };
}

export async function getOverview(filter: AnalyticsFilter): Promise<OverviewData> {
  const range = resolveDateRange(filter);
  const prev = getComparisonRange(range);

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
    countVisitors(range.from, range.to),
    countVisitors(prev.from, prev.to),
    countLoggedIn(range.from, range.to),
    countLoggedIn(prev.from, prev.to),
    countReturning(range.from, range.to),
    countReturning(prev.from, prev.to),
    avgDuration(range.from, range.to),
    avgDuration(prev.from, prev.to),
    bounceRatePct(range.from, range.to),
    bounceRatePct(prev.from, prev.to),
    countPageViews(range.from, range.to),
    countPageViews(prev.from, prev.to),
    avgPages(range.from, range.to),
    avgPages(prev.from, prev.to),
    countActiveNow(),
    countNewToday(),
    sessionsToday(),
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
