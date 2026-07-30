import { SessionModel } from '@/models/analytics/index.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minute heartbeat window

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

export async function getLiveVisitors(): Promise<LiveVisitor[]> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const sessions = await SessionModel.find({
    isActive: true,
    lastActiveAt: { $gte: cutoff },
  })
    .sort({ lastActiveAt: -1 })
    .limit(200)
    .lean();

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    visitorId: s.visitorId,
    userId: s.userId?.toString() ?? null,
    currentPage: s.exitPage ?? s.entryPage ?? null,
    timeOnSiteMs: s.lastActiveAt.getTime() - s.startedAt.getTime(),
    country: s.country ?? null,
    deviceType: s.deviceType,
    browser: s.browser ?? null,
    startedAt: s.startedAt,
    lastActiveAt: s.lastActiveAt,
  }));
}

export async function getActiveCount(): Promise<number> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  return SessionModel.countDocuments({ isActive: true, lastActiveAt: { $gte: cutoff } });
}
