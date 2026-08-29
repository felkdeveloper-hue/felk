import { createHash } from 'node:crypto';
import type { Request } from 'express';
import type { Types } from 'mongoose';
import { VisitorModel, SessionModel, PageViewModel, EventModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import type {
  CollectBody,
  VisitorPayload,
  SessionPayload,
  PageViewPayload,
  EventPayload,
} from '@/schemas/analytics/index.js';
import { resolveGeo, anonymizeIp, resolveGeoFromIp, getClientIp } from './geoip.util.js';
import { parseUserAgent } from './ua-parser.util.js';
import {
  classifyTrafficSource,
  detectInAppSource,
  pickFirstTouchAttribution,
} from './source-attribution.util.js';
import { evaluateAnalyticsBotFilter } from './bot-filter.util.js';
import { isStaffRoleKey } from './admin-traffic.util.js';
import type { GeoData } from '@/models/analytics/index.js';

function mergeGeo(existing: GeoData | null | undefined, incoming: GeoData): GeoData {
  const prev = existing ?? {};
  return {
    country: prev.country ?? incoming.country ?? null,
    countryCode: prev.countryCode ?? incoming.countryCode ?? null,
    region: prev.region ?? incoming.region ?? null,
    city: prev.city ?? incoming.city ?? null,
    timezone: prev.timezone ?? incoming.timezone ?? null,
  };
}

function geoIsEmpty(geo: GeoData): boolean {
  return !geo.country && !geo.countryCode && !geo.city && !geo.region;
}

function hintGeoFromClient(payload: VisitorPayload): GeoData | null {
  const timezone = payload.geo?.timezone ?? null;
  if (timezone === 'Asia/Colombo') {
    return { country: 'Sri Lanka', countryCode: 'LK', region: null, city: null, timezone };
  }
  const language = payload.device?.language ?? '';
  if (/-(LK)\b/i.test(language)) {
    return { country: 'Sri Lanka', countryCode: 'LK', region: null, city: null, timezone };
  }
  return null;
}

function hashIp(ip: string | undefined): string {
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

async function upsertVisitor(
  payload: VisitorPayload,
  req: Request,
  userId: Types.ObjectId | undefined,
): Promise<void> {
  const ua = req.headers['user-agent'];
  const ip = getClientIp(req);
  const parsedDevice = parseUserAgent(ua);
  let geo = payload.geo ?? resolveGeo(req);
  if (geoIsEmpty(geo)) {
    const fromIp = await resolveGeoFromIp(ip);
    if (fromIp) geo = mergeGeo(geo, fromIp);
  }
  if (geoIsEmpty(geo)) {
    const hinted = hintGeoFromClient(payload);
    if (hinted) geo = mergeGeo(geo, hinted);
  }

  const incomingSignals = {
    referrer: payload.referrer ?? null,
    utmSource: payload.utmSource ?? null,
    utmMedium: payload.utmMedium ?? null,
    utmCampaign: payload.utmCampaign ?? null,
    utmContent: payload.utmContent ?? null,
    fbclid: payload.fbclid ?? null,
    gclid: payload.gclid ?? null,
    ttclid: payload.ttclid ?? null,
    msclkid: payload.msclkid ?? null,
    igshid: payload.igshid ?? null,
    inAppSource: payload.inAppSource ?? detectInAppSource(typeof ua === 'string' ? ua : null),
  };

  const existing = await VisitorModel.findOne({ visitorId: payload.visitorId })
    .select(
      'geo referrer utmSource utmMedium utmCampaign utmTerm utmContent trafficSource fbclid gclid ttclid msclkid igshid inAppSource landingPath',
    )
    .lean();

  const ipKey = hashIp(ip);
  // Same public IP, new browser/cookie — keep the first social/ads source (90 days).
  let priorByIp: typeof existing = null;
  if (!existing) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    priorByIp = await VisitorModel.findOne({
      ipHash: ipKey,
      firstSeenAt: { $gte: ninetyDaysAgo },
      visitorId: { $ne: payload.visitorId },
    })
      .sort({ firstSeenAt: 1 })
      .select(
        'referrer utmSource utmMedium utmCampaign utmTerm utmContent trafficSource fbclid gclid ttclid msclkid igshid inAppSource landingPath',
      )
      .lean();
  }

  const seed = existing ?? priorByIp;
  const kept = pickFirstTouchAttribution(
    seed
      ? {
          referrer: seed.referrer,
          utmSource: seed.utmSource,
          utmMedium: seed.utmMedium,
          utmCampaign: seed.utmCampaign,
          utmContent: seed.utmContent,
          fbclid: seed.fbclid,
          gclid: seed.gclid,
          ttclid: seed.ttclid,
          msclkid: seed.msclkid,
          igshid: seed.igshid,
          inAppSource: seed.inAppSource,
        }
      : null,
    incomingSignals,
  );
  const trafficSource = classifyTrafficSource(kept);
  const device = {
    ...parsedDevice,
    screenResolution: payload.device?.screenResolution ?? null,
    language: payload.device?.language ?? null,
    type: payload.device?.type ?? parsedDevice.type,
  };

  const firstTouchFields = {
    referrer: kept.referrer ?? null,
    utmSource: kept.utmSource ?? null,
    utmMedium: kept.utmMedium ?? null,
    utmCampaign: kept.utmCampaign ?? null,
    utmTerm: existing?.utmTerm ?? payload.utmTerm ?? null,
    utmContent: existing?.utmContent ?? kept.utmContent ?? payload.utmContent ?? null,
    fbclid: kept.fbclid ?? null,
    gclid: kept.gclid ?? null,
    ttclid: kept.ttclid ?? null,
    msclkid: kept.msclkid ?? null,
    igshid: kept.igshid ?? existing?.igshid ?? null,
    inAppSource: existing?.inAppSource ?? kept.inAppSource ?? null,
    landingPath: existing?.landingPath ?? payload.landingPath ?? null,
    trafficSource,
  };

  const mergedGeo = mergeGeo(existing?.geo as GeoData | undefined, geo);

  // totalVisits increments only when a new session is created (see upsertSession).
  const wasNew = !existing;
  await VisitorModel.findOneAndUpdate(
    { visitorId: payload.visitorId },
    {
      $setOnInsert: {
        visitorId: payload.visitorId,
        ipHash: ipKey,
        firstSeenAt: new Date(),
        isReturning: Boolean(priorByIp),
        totalVisits: 0,
        ...firstTouchFields,
      },
      $set: {
        geo: mergedGeo,
        device,
        lastSeenAt: new Date(),
        ipHash: ipKey,
        ...firstTouchFields,
        ...(userId ? { userId } : {}),
      },
    },
    { upsert: true, new: false },
  );

  // Heartbeat may have created a session before the visitor row existed — catch up.
  if (wasNew) {
    const sessionCount = await SessionModel.countDocuments({ visitorId: payload.visitorId });
    if (sessionCount > 0) {
      await VisitorModel.updateOne(
        { visitorId: payload.visitorId },
        {
          $set: {
            totalVisits: sessionCount,
            isReturning: sessionCount > 1 || Boolean(priorByIp),
          },
        },
      );
    }
  } else {
    await VisitorModel.updateOne(
      { visitorId: payload.visitorId, totalVisits: { $gt: 1 } },
      { $set: { isReturning: true } },
    );
  }

  if (userId) {
    const country = mergedGeo.country ?? mergedGeo.countryCode ?? null;
    const deviceLabel =
      parsedDevice.type === 'mobile'
        ? 'Phone'
        : parsedDevice.type === 'tablet'
          ? 'Tablet'
          : parsedDevice.type === 'desktop'
            ? 'Desktop'
            : null;
    const patch: Record<string, string> = {};
    if (country) patch.lastLoginCountry = country;
    if (deviceLabel) patch.lastLoginDevice = deviceLabel;
    if (Object.keys(patch).length) {
      await UserModel.updateOne({ _id: userId }, { $set: patch });
    }
  }
}

async function upsertSession(
  payload: SessionPayload,
  req: Request,
  userId: Types.ObjectId | undefined,
): Promise<void> {
  const ua = req.headers['user-agent'];
  const parsedDevice = parseUserAgent(ua);
  let geo = resolveGeo(req);
  if (geoIsEmpty(geo)) {
    const fromIp = await resolveGeoFromIp(getClientIp(req));
    if (fromIp) geo = mergeGeo(geo, fromIp);
  }
  const visitorDoc = await VisitorModel.findOne({ visitorId: payload.visitorId })
    .select('trafficSource')
    .lean();
  const sessionTrafficSource = visitorDoc?.trafficSource ?? 'direct';

  const existingBefore = await SessionModel.exists({ sessionId: payload.sessionId });

  const result = await SessionModel.updateOne(
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
        trafficSource: sessionTrafficSource,
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
    { upsert: true },
  );

  // Count a visit once per new session (not on every heartbeat / visitor upsert).
  if (!existingBefore && result.upsertedCount === 1) {
    const updated = await VisitorModel.findOneAndUpdate(
      { visitorId: payload.visitorId },
      { $inc: { totalVisits: 1 } },
      { new: true },
    );
    if (updated && updated.totalVisits > 1) {
      await VisitorModel.updateOne(
        { visitorId: payload.visitorId },
        { $set: { isReturning: true } },
      );
    }
  }

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
  req: Request,
): Promise<void> {
  if (!views.length) return;

  let geo = resolveGeo(req);
  if (geoIsEmpty(geo)) {
    const fromIp = await resolveGeoFromIp(getClientIp(req));
    if (fromIp) geo = mergeGeo(geo, fromIp);
  }

  const docs = views.map((v) => ({
    ...(v.pageViewId ? { pageViewId: v.pageViewId } : {}),
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
    country: geo.countryCode ?? geo.country ?? null,
  }));

  try {
    await PageViewModel.insertMany(docs, { ordered: false });
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? (err as { code?: number }).code : undefined;
    // Duplicate pageViewId is expected (retries / Strict Mode). Log anything else.
    if (code !== 11000) {
      logger.warn({ err, count: docs.length }, 'PageView insertMany failed');
    }
  }
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

async function ensureVisitorStub(
  visitorId: string,
  req: Request,
  userId: Types.ObjectId | undefined,
  landingPath?: string | null,
): Promise<void> {
  const ip = getClientIp(req);
  const ipKey = hashIp(ip);
  const now = new Date();
  await VisitorModel.updateOne(
    { visitorId },
    {
      $setOnInsert: {
        visitorId,
        ipHash: ipKey,
        firstSeenAt: now,
        isReturning: false,
        totalVisits: 0,
        trafficSource: 'direct',
        landingPath: landingPath ?? null,
      },
      $set: {
        lastSeenAt: now,
        ipHash: ipKey,
        ...(userId ? { userId } : {}),
      },
    },
    { upsert: true },
  );
}

async function processHeartbeat(
  sessionId: string,
  visitorId: string,
  currentPage?: string | null,
): Promise<void> {
  const now = new Date();
  const existed = await SessionModel.exists({ sessionId });
  // Always revive the session — mobile browsers often fire pagehide/beforeunload
  // and mark isActive=false when switching apps; a later heartbeat must bring them back.
  const result = await SessionModel.updateOne(
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
  if (!existed && result.upsertedCount === 1) {
    await VisitorModel.updateOne({ visitorId }, { $inc: { totalVisits: 1 } });
  }
  await VisitorModel.updateOne({ visitorId }, { $set: { lastSeenAt: now } }, { upsert: false });
}

export async function processCollect(body: CollectBody, req: Request): Promise<void> {
  // Never ingest staff/admin browsing (storefront or panel) into shopper metrics.
  if (isStaffRoleKey(req.user?.roleKey)) {
    logger.debug({ userId: req.user?.id }, 'Analytics collect skipped (staff user)');
    return;
  }

  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
  const samplePath =
    body.pageViews?.[0]?.path ??
    body.session?.entryPage ??
    body.session?.lastPage ??
    body.heartbeat?.path ??
    body.visitor?.landingPath ??
    null;

  const botCheck = evaluateAnalyticsBotFilter({
    userAgent: ua,
    path: samplePath,
    enabled: appConfig.analytics.botFilter,
  });
  if (botCheck.exclude) {
    logger.debug({ reason: botCheck.reason }, 'Analytics collect skipped (bot/invalid)');
    return;
  }

  const userId = req.user?.id as Types.ObjectId | undefined;

  // Isolate each step — a session/visitor failure must never drop pageViews/events
  // (that made landers/visitors read 0 while commerce events still arrived).
  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      logger.warn({ err, label }, 'Analytics collect step failed');
    }
  };

  // Visitor before session so totalVisits $inc finds the visitor row.
  if (body.visitor) {
    await run('visitor', () => upsertVisitor(body.visitor!, req, userId));
  }
  if (body.session) {
    await run('session', () => upsertSession(body.session!, req, userId));
  }

  const ops: Promise<void>[] = [];

  if (body.pageViews?.length) {
    ops.push(run('pageViews', () => insertPageViews(body.pageViews!, userId, req)));
  }

  if (body.events?.length) {
    ops.push(run('events', () => insertEvents(body.events!, userId)));
  }

  if (body.heartbeat) {
    ops.push(
      run('heartbeat', () =>
        processHeartbeat(
          body.heartbeat!.sessionId,
          body.heartbeat!.visitorId,
          body.heartbeat!.path ?? null,
        ),
      ),
    );
  }

  // Also ensure a session + visitor row exists for event-only batches
  // (visitor stub stores ipHash so unique-IP visitors work without a full visitor payload).
  if (!body.session && !body.heartbeat && body.events?.length) {
    const ev = body.events.find((e) => e.sessionId && e.visitorId);
    if (ev?.sessionId && ev.visitorId) {
      ops.push(
        run('visitor-from-event', () =>
          ensureVisitorStub(ev.visitorId!, req, userId, ev.path ?? null),
        ),
      );
      ops.push(
        run('session-from-event', () =>
          upsertSession(
            {
              sessionId: ev.sessionId!,
              visitorId: ev.visitorId!,
              entryPage: ev.path ?? null,
              lastPage: ev.path ?? null,
              isActive: true,
            },
            req,
            userId,
          ),
        ),
      );
    }
  }

  // Heartbeat without visitor payload — still stamp IP on the visitor cookie.
  if (body.heartbeat?.visitorId && !body.visitor) {
    ops.push(
      run('visitor-from-heartbeat', () =>
        ensureVisitorStub(body.heartbeat!.visitorId, req, userId, body.heartbeat!.path ?? null),
      ),
    );
  }

  await Promise.all(ops);
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
