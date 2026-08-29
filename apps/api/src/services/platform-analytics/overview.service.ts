import { SessionModel, PageViewModel, EventModel } from '@/models/analytics/index.js';
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
 * LANDERS = total landings/sessions in period (can exceed unique visitors).
 * Formula: max(
 *   session docs,
 *   entry page-views,
 *   distinct page-view sessionIds,
 *   distinct event sessionIds
 * )
 * Event sessionIds are OK here — each landing/session counts, not unique people.
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

/** AVG(durationMs) on sessions that recorded duration; empty set → 0. */
async function avgDurationMs(sessionMatch: Record<string, unknown>): Promise<number> {
  const r = await SessionModel.aggregate<{ avg: number }>([
    { $match: { ...sessionMatch, durationMs: { $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$durationMs' } } },
  ]);
  return Math.round(r[0]?.avg ?? 0);
}

/**
 * Bounce rate % = bounced sessions / session docs in period.
 * Only SessionModel rows — never invent a rate from event-session landers alone.
 * No session docs → 0 (treat as N/A).
 */
async function bounceRatePct(sessionMatch: Record<string, unknown>): Promise<number> {
  const total = await SessionModel.countDocuments(sessionMatch);
  if (!total) return 0;
  const bounces = await SessionModel.countDocuments({ ...sessionMatch, isBounce: true });
  return Math.round((bounces / total) * 100 * 10) / 10;
}

/**
 * Avg pages/session = page_views / landers when landers > 0
 * (honest when session.pageCount defaults to 1 from event-only upserts).
 * Else AVG(session.pageCount) if session docs exist; else 0 (not a fake 1.0).
 */
async function avgPagesPerSession(
  sessionMatch: Record<string, unknown>,
  pageViews: number,
  landers: number,
): Promise<number> {
  if (landers > 0) {
    return Math.round((pageViews / landers) * 10) / 10;
  }
  const total = await SessionModel.countDocuments(sessionMatch);
  if (!total) return 0;
  const r = await SessionModel.aggregate<{ avg: number }>([
    { $match: sessionMatch },
    { $group: { _id: null, avg: { $avg: '$pageCount' } } },
  ]);
  return Math.round((r[0]?.avg ?? 0) * 10) / 10;
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
  const todayEvents = excludeAdminAudience(
    {
      occurredAt: { $gte: todayRange.from, $lte: todayRange.to },
      sessionId: { $type: 'string' },
    },
    staffIds,
    'path',
  );

  const [
    // VISITORS: unique public IPs (1 per IP per day/period). Guests + customers.
    // Not sign-ups, not login-only. Same IP same day = 1; next day counts again.
    tv,
    pvTv,
    li,
    pvLi,
    // RETURNING: unique IPs among those active visitors with isReturning=true
    // (prior visit / totalVisits>1 set at session ingest).
    ret,
    pvRet,
    dur,
    pvDur,
    br,
    pvBr,
    // PAGE VIEWS: count of PageView docs in period (admin-excluded).
    pv,
    pvPv,
    activeNow,
    newToday,
    // SESSIONS TODAY: session docs today, else distinct event sessionIds today.
    sToday,
    landCur,
    landPrev,
    usersCur,
    usersPrev,
  ] = await Promise.all([
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur, {}, eventCur),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev, {}, eventPrev),
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur, { userId: { $ne: null } }, eventCur),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev, { userId: { $ne: null } }, eventPrev),
    countUniqueVisitorIpsFromActivity(pageCur, sessionCur, { isReturning: true }, eventCur),
    countUniqueVisitorIpsFromActivity(pagePrev, sessionPrev, { isReturning: true }, eventPrev),
    avgDurationMs(sessionCur),
    avgDurationMs(sessionPrev),
    bounceRatePct(sessionCur),
    bounceRatePct(sessionPrev),
    PageViewModel.countDocuments(pageCur),
    PageViewModel.countDocuments(pagePrev),
    SessionModel.countDocuments(activeMatch),
    UserModel.countDocuments({
      isDeleted: false,
      createdAt: { $gte: todayRange.from, $lte: todayRange.to },
    }),
    SessionModel.countDocuments(sessionsTodayMatch).then(async (n) => {
      if (n > 0) return n;
      return EventModel.distinct('sessionId', todayEvents).then((ids) => ids.length);
    }),
    countLandingEvents(sessionCur, pageCur, eventCur),
    countLandingEvents(sessionPrev, pagePrev, eventPrev),
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

  const [ap, pvAp] = await Promise.all([
    avgPagesPerSession(sessionCur, pv, landCur),
    avgPagesPerSession(sessionPrev, pvPv, landPrev),
  ]);

  return {
    period: range,
    periodLabel: formatPeriodLabel(filter),
    // Landers and visitors are independent: landers may exceed unique IPs.
    landers: makeMetric(landCur, landPrev),
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
