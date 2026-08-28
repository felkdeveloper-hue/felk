import { z } from 'zod';

const geoSchema = z.object({
  country: z.string().max(100).optional().nullable(),
  countryCode: z.string().max(10).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
});

const deviceSchema = z.object({
  type: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).default('unknown'),
  os: z.string().max(100).optional().nullable(),
  osVersion: z.string().max(50).optional().nullable(),
  browser: z.string().max(100).optional().nullable(),
  browserVersion: z.string().max(50).optional().nullable(),
  screenResolution: z.string().max(20).optional().nullable(),
  language: z.string().max(20).optional().nullable(),
});

const visitorPayloadSchema = z.object({
  visitorId: z.string().uuid(),
  geo: geoSchema.optional(),
  device: deviceSchema.optional(),
  referrer: z.string().max(2000).optional().nullable(),
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  fbclid: z.string().max(500).optional().nullable(),
  gclid: z.string().max(500).optional().nullable(),
  ttclid: z.string().max(500).optional().nullable(),
  msclkid: z.string().max(500).optional().nullable(),
  igshid: z.string().max(500).optional().nullable(),
  inAppSource: z.string().max(50).optional().nullable(),
  landingPath: z.string().max(2000).optional().nullable(),
});

const sessionPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  visitorId: z.string().uuid(),
  startedAt: z.string().datetime().optional(),
  entryPage: z.string().max(2000).optional().nullable(),
  exitPage: z.string().max(2000).optional().nullable(),
  lastPage: z.string().max(2000).optional().nullable(),
  pageCount: z.number().int().min(0).optional(),
  clickCount: z.number().int().min(0).optional(),
  maxScrollDepth: z.number().min(0).max(100).optional(),
  activeMs: z.number().int().min(0).optional(),
  idleMs: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
  avgTimePerPageMs: z.number().int().min(0).optional().nullable(),
  endedAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

const pageViewPayloadSchema = z.object({
  pageViewId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  visitorId: z.string().uuid(),
  path: z.string().max(2000),
  title: z.string().max(500).optional().nullable(),
  referrer: z.string().max(2000).optional().nullable(),
  viewedAt: z.string().datetime(),
  timeOnPageMs: z.number().int().min(0).optional().nullable(),
  scrollDepth: z.number().min(0).max(100).optional(),
  isEntry: z.boolean().optional(),
  isExit: z.boolean().optional(),
});

const eventPayloadSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sessionId: z.string().uuid().optional().nullable(),
  visitorId: z.string().uuid().optional().nullable(),
  path: z.string().max(2000).optional().nullable(),
  properties: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});

export const collectBodySchema = z.object({
  visitor: visitorPayloadSchema.optional(),
  session: sessionPayloadSchema.optional(),
  pageViews: z.array(pageViewPayloadSchema).max(50).optional(),
  events: z.array(eventPayloadSchema).max(100).optional(),
  heartbeat: z
    .object({
      sessionId: z.string().uuid(),
      visitorId: z.string().uuid(),
      /** Current path so Live visitors show the page they're on */
      path: z.string().trim().max(2048).optional(),
    })
    .optional(),
});

export type CollectBody = z.infer<typeof collectBodySchema>;
export type VisitorPayload = z.infer<typeof visitorPayloadSchema>;
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
export type PageViewPayload = z.infer<typeof pageViewPayloadSchema>;
export type EventPayload = z.infer<typeof eventPayloadSchema>;
