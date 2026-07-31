import { SessionModel } from '@/models/analytics/index.js';

/** Visitors with activity inside this window count as "live". */
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export interface LiveVisitor {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  currentPage: string | null;
  timeOnSiteMs: number;
  country: string | null;
  deviceType: string;
  browser: string | null;
  startedAt: Date;
  lastActiveAt: Date;
}

/**
 * Live = recent activity on lastActiveAt.
 * Do not require isActive — mobile browsers often mark sessions inactive on
 * pagehide even while the user is still on the site.
 */
function liveMatch(cutoff: Date) {
  return { lastActiveAt: { $gte: cutoff } };
}

export async function getLiveVisitors(): Promise<LiveVisitor[]> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const sessions = await SessionModel.find(liveMatch(cutoff))
    .sort({ lastActiveAt: -1 })
    .limit(200)
    .lean();

  // Mark stale "active" flags cleanly for sessions that fell out of the window
  void SessionModel.updateMany(
    { isActive: true, lastActiveAt: { $lt: cutoff } },
    { $set: { isActive: false } },
  ).catch(() => undefined);

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    visitorId: s.visitorId,
    userId: s.userId?.toString() ?? null,
    currentPage: s.lastPage ?? s.exitPage ?? s.entryPage ?? null,
    timeOnSiteMs: Math.max(0, s.lastActiveAt.getTime() - s.startedAt.getTime()),
    country: s.country ?? null,
    deviceType: s.deviceType,
    browser: s.browser ?? null,
    startedAt: s.startedAt,
    lastActiveAt: s.lastActiveAt,
  }));
}

export async function getActiveCount(): Promise<number> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  return SessionModel.countDocuments(liveMatch(cutoff));
}
