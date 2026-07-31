import { createHash } from 'node:crypto';
import type { Request } from 'express';
import type { Types } from 'mongoose';
import { VisitorModel, SessionModel, PageViewModel, EventModel } from '@/models/analytics/index.js';
import type {
  CollectBody,
  VisitorPayload,
  SessionPayload,
  PageViewPayload,
  EventPayload,
} from '@/schemas/analytics/index.js';
import { resolveGeo, anonymizeIp } from './geoip.util.js';
import { parseUserAgent, classifyTrafficSource } from './ua-parser.util.js';

function hashIp(ip: string | undefined): string {
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

async function upsertVisitor(
  payload: VisitorPayload,
  req: Request,
  userId: Types.ObjectId | undefined,
): Promise<void> {
  const ua = req.headers['user-agent'];
  const ip = req.ip;
  const parsedDevice = parseUserAgent(ua);
  const geo = payload.geo ?? resolveGeo(req);
  const trafficSource = classifyTrafficSource({
    referrer: payload.referrer,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
  });
  const device = {
    ...parsedDevice,
    screenResolution: payload.device?.screenResolution ?? null,
    language: payload.device?.language ?? null,
    type: payload.device?.type ?? parsedDevice.type,
  };

  await VisitorModel.findOneAndUpdate(
    { visitorId: payload.visitorId },
    {
      $setOnInsert: {
        visitorId: payload.visitorId,
        ipHash: hashIp(ip),
        firstSeenAt: new Date(),
        isReturning: false,
      },
      $set: {
        geo,
        device,
        referrer: payload.referrer ?? null,
        utmSource: payload.utmSource ?? null,
        utmMedium: payload.utmMedium ?? null,
        utmCampaign: payload.utmCampaign ?? null,
        utmTerm: payload.utmTerm ?? null,
        utmContent: payload.utmContent ?? null,
        trafficSource,
        lastSeenAt: new Date(),
        ...(userId ? { userId } : {}),
      },
      $inc: { totalVisits: 1 },
    },
    { upsert: true, new: false },
  );

  // Mark as returning on subsequent visits
  await VisitorModel.updateOne(
    { visitorId: payload.visitorId, totalVisits: { $gt: 1 } },
    { $set: { isReturning: true } },
  );
}

async function upsertSession(
  payload: SessionPayload,
  req: Request,
  userId: Types.ObjectId | undefined,
): Promise<void> {
  const ua = req.headers['user-agent'];
  const parsedDevice = parseUserAgent(ua);
  const geo = resolveGeo(req);

  await SessionModel.findOneAndUpdate(
    { sessionId: payload.sessionId },
    {
      $setOnInsert: {
        sessionId: payload.sessionId,
        visitorId: payload.visitorId,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
        deviceType: parsedDevice.type,
        browser: parsedDevice.browser ?? null,
        os: parsedDevice.os ?? null,
        country: geo.countryCode ?? null,
        entryPage: payload.entryPage ?? null,
        isActive: true,
        isBounce: true,
        ...(userId ? { userId } : {}),
      },
      $set: {
        lastActiveAt: new Date(),
        ...(payload.pageCount !== undefined ? { pageCount: payload.pageCount } : {}),
        ...(payload.clickCount !== undefined ? { clickCount: payload.clickCount } : {}),
        ...(payload.maxScrollDepth !== undefined ? { maxScrollDepth: payload.maxScrollDepth } : {}),
        ...(payload.activeMs !== undefined ? { activeMs: payload.activeMs } : {}),
        ...(payload.idleMs !== undefined ? { idleMs: payload.idleMs } : {}),
        ...(payload.durationMs !== undefined ? { durationMs: payload.durationMs } : {}),
        ...(payload.avgTimePerPageMs !== undefined
          ? { avgTimePerPageMs: payload.avgTimePerPageMs }
          : {}),
        ...(payload.exitPage !== undefined ? { exitPage: payload.exitPage } : {}),
        ...(payload.lastPage !== undefined ? { lastPage: payload.lastPage } : {}),
        ...(payload.endedAt ? { endedAt: new Date(payload.endedAt) } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(userId ? { userId } : {}),
      },
    },
    { upsert: true, new: false },
  );

  // Not a bounce if more than 1 page
  if (payload.pageCount && payload.pageCount > 1) {
    await SessionModel.updateOne({ sessionId: payload.sessionId }, { $set: { isBounce: false } });
  }

  // Derive avg time per page when we have duration + page count
  if (payload.durationMs && payload.pageCount && payload.pageCount > 0) {
    await SessionModel.updateOne(
      { sessionId: payload.sessionId, avgTimePerPageMs: null },
      { $set: { avgTimePerPageMs: Math.round(payload.durationMs / payload.pageCount) } },
    );
  }
}

async function insertPageViews(
  views: PageViewPayload[],
  userId: Types.ObjectId | undefined,
): Promise<void> {
  if (!views.length) return;

  const docs = views.map((v) => ({
    sessionId: v.sessionId,
    visitorId: v.visitorId,
    userId: userId ?? null,
    path: v.path,
    title: v.title ?? null,
    referrer: v.referrer ?? null,
    viewedAt: new Date(v.viewedAt),
    timeOnPageMs: v.timeOnPageMs ?? null,
    scrollDepth: v.scrollDepth ?? 0,
    isEntry: v.isEntry ?? false,
    isExit: v.isExit ?? false,
    deviceType: 'unknown',
    country: null,
  }));

  await PageViewModel.insertMany(docs, { ordered: false });
}

async function insertEvents(
  events: EventPayload[],
  userId: Types.ObjectId | undefined,
): Promise<void> {
  if (!events.length) return;

  const docs = events.map((e) => ({
    eventId: e.eventId,
    name: e.name,
    sessionId: e.sessionId ?? null,
    visitorId: e.visitorId ?? null,
    userId: userId ?? null,
    path: e.path ?? null,
    properties: e.properties ?? {},
    occurredAt: new Date(e.occurredAt),
  }));

  // Ignore duplicate eventIds (unique index) via ordered:false
  try {
    await EventModel.insertMany(docs, { ordered: false });
  } catch {
    /* duplicate keys */
  }

  // Broadcast high-signal events to live admin feed
  try {
    const { publishAnalyticsActivity } = await import('./live.gateway.js');
    for (const d of docs) {
      publishAnalyticsActivity({
        eventId: d.eventId,
        name: d.name,
        occurredAt: d.occurredAt,
        userId: d.userId ? String(d.userId) : null,
        path: d.path,
        sessionId: d.sessionId,
        properties: d.properties as Record<string, unknown>,
      });
    }
  } catch {
    /* socket optional */
  }
}

async function processHeartbeat(
  sessionId: string,
  visitorId: string,
  currentPage?: string | null,
): Promise<void> {
  const now = new Date();
  // Always revive the session — mobile browsers often fire pagehide/beforeunload
  // and mark isActive=false when switching apps; a later heartbeat must bring them back.
  await SessionModel.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        visitorId,
        lastActiveAt: now,
        isActive: true,
        ...(currentPage ? { lastPage: currentPage, exitPage: currentPage } : {}),
      },
      $setOnInsert: {
        sessionId,
        visitorId,
        startedAt: now,
        deviceType: 'unknown',
        isBounce: true,
        entryPage: currentPage ?? null,
      },
      $unset: { endedAt: '' },
    },
    { upsert: true },
  );
  await VisitorModel.updateOne({ visitorId }, { $set: { lastSeenAt: now } }, { upsert: false });
}

export async function processCollect(body: CollectBody, req: Request): Promise<void> {
  const userId = req.user?.id as Types.ObjectId | undefined;

  const ops: Promise<void>[] = [];

  if (body.visitor) {
    ops.push(upsertVisitor(body.visitor, req, userId));
  }

  if (body.session) {
    ops.push(upsertSession(body.session, req, userId));
  }

  if (body.pageViews?.length) {
    ops.push(insertPageViews(body.pageViews, userId));
  }

  if (body.events?.length) {
    ops.push(insertEvents(body.events, userId));
  }

  if (body.heartbeat) {
    ops.push(
      processHeartbeat(
        body.heartbeat.sessionId,
        body.heartbeat.visitorId,
        body.heartbeat.path ?? null,
      ),
    );
  }

  await Promise.allSettled(ops);
}

/** Emit a server-side business event directly (no HTTP round-trip). */
export async function emitBusinessEvent(opts: {
  eventId: string;
  name: string;
  userId?: string | null;
  sessionId?: string | null;
  visitorId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
}): Promise<void> {
  try {
    const occurredAt = new Date();
    await EventModel.create({
      eventId: opts.eventId,
      name: opts.name,
      userId: opts.userId ?? null,
      sessionId: opts.sessionId ?? null,
      visitorId: opts.visitorId ?? null,
      path: opts.path ?? null,
      properties: opts.properties ?? {},
      occurredAt,
    });
    try {
      const { publishAnalyticsActivity } = await import('./live.gateway.js');
      publishAnalyticsActivity({
        eventId: opts.eventId,
        name: opts.name,
        occurredAt,
        userId: opts.userId,
        path: opts.path,
        sessionId: opts.sessionId,
        properties: opts.properties,
      });
    } catch {
      /* socket optional */
    }
  } catch {
    // duplicate eventId — already recorded
  }
}
