import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import {
  classifyTrafficSource,
  detectInAppSource,
  formatAttribution,
  pickFirstTouchAttribution,
  type AttributionSignals,
} from './source-attribution.util.js';
import { anonymizeIp, resolveGeoFromIp, getClientIp } from './geoip.util.js';
import { parseUserAgent } from './ua-parser.util.js';
import type { Request } from 'express';

export type ClientAttributionInput = AttributionSignals & {
  visitorId?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
};

function formatLocation(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  return cleaned.length ? cleaned.join(', ') : null;
}

function hashIp(ip: string | undefined): string {
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

/**
 * Attach the browser visitor (and first-touch ads) to a logged-in / guest user.
 * Call on guest checkout, login, and signup so admin Users shows Source correctly.
 */
export async function linkVisitorToUser(opts: {
  userId: string;
  attribution?: ClientAttributionInput | null;
  req?: Request;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const userId = opts.userId;
  if (!Types.ObjectId.isValid(userId)) return;

  const visitorId = opts.attribution?.visitorId?.trim() || null;
  const ua = opts.userAgent ?? (opts.req ? opts.req.get('user-agent') : undefined) ?? undefined;
  const ip = opts.ip ?? (opts.req ? getClientIp(opts.req) : undefined);

  const incoming: AttributionSignals = {
    referrer: opts.attribution?.referrer ?? null,
    utmSource: opts.attribution?.utmSource ?? null,
    utmMedium: opts.attribution?.utmMedium ?? null,
    utmCampaign: opts.attribution?.utmCampaign ?? null,
    utmContent: opts.attribution?.utmContent ?? null,
    fbclid: opts.attribution?.fbclid ?? null,
    gclid: opts.attribution?.gclid ?? null,
    ttclid: opts.attribution?.ttclid ?? null,
    msclkid: opts.attribution?.msclkid ?? null,
    igshid: opts.attribution?.igshid ?? null,
    inAppSource: opts.attribution?.inAppSource ?? detectInAppSource(ua) ?? null,
  };

  let existingSignals: AttributionSignals | null = null;
  if (visitorId) {
    const existing = await VisitorModel.findOne({ visitorId })
      .select(
        'referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource trafficSource geo device',
      )
      .lean();
    if (existing) {
      existingSignals = {
        referrer: existing.referrer,
        utmSource: existing.utmSource,
        utmMedium: existing.utmMedium,
        utmCampaign: existing.utmCampaign,
        utmContent: existing.utmContent,
        fbclid: existing.fbclid,
        gclid: existing.gclid,
        ttclid: existing.ttclid,
        msclkid: existing.msclkid,
        igshid: existing.igshid,
        inAppSource: existing.inAppSource,
      };
    }
  }

  const kept = pickFirstTouchAttribution(existingSignals, incoming);
  const trafficSource = classifyTrafficSource(kept);
  const attribution = formatAttribution({ trafficSource, ...kept });
  const device = parseUserAgent(ua);
  const geo = await resolveGeoFromIp(ip);
  const location = formatLocation([geo?.city, geo?.region, geo?.country ?? geo?.countryCode]);
  const deviceLabel =
    device.type === 'mobile'
      ? 'Phone'
      : device.type === 'tablet'
        ? 'Tablet'
        : device.type === 'desktop'
          ? 'Desktop'
          : null;

  if (visitorId) {
    await VisitorModel.findOneAndUpdate(
      { visitorId },
      {
        $setOnInsert: {
          visitorId,
          ipHash: hashIp(ip),
          firstSeenAt: new Date(),
          isReturning: false,
          totalVisits: 1,
          totalSessions: 1,
        },
        $set: {
          userId: new Types.ObjectId(userId),
          lastSeenAt: new Date(),
          trafficSource,
          referrer: kept.referrer ?? null,
          utmSource: kept.utmSource ?? null,
          utmMedium: kept.utmMedium ?? null,
          utmCampaign: kept.utmCampaign ?? null,
          utmTerm: opts.attribution?.utmTerm ?? null,
          utmContent: kept.utmContent ?? null,
          fbclid: kept.fbclid ?? null,
          gclid: kept.gclid ?? null,
          ttclid: kept.ttclid ?? null,
          msclkid: kept.msclkid ?? null,
          igshid: kept.igshid ?? null,
          inAppSource: kept.inAppSource ?? null,
          landingPath: opts.attribution?.landingPath ?? null,
          ...(geo
            ? {
                geo: {
                  country: geo.country ?? null,
                  countryCode: geo.countryCode ?? null,
                  region: geo.region ?? null,
                  city: geo.city ?? null,
                  timezone: geo.timezone ?? null,
                },
              }
            : {}),
          device: {
            type: device.type,
            os: device.os ?? null,
            osVersion: device.osVersion ?? null,
            browser: device.browser ?? null,
            browserVersion: device.browserVersion ?? null,
          },
        },
      },
      { upsert: true },
    );
  }

  const patch: Record<string, unknown> = {
    'metadata.acquisition': {
      sourceLabel: attribution.label,
      sourceChannel: attribution.channel,
      sourceDetail: attribution.detail ?? null,
      trafficSource,
      utmSource: kept.utmSource ?? null,
      utmMedium: kept.utmMedium ?? null,
      utmCampaign: kept.utmCampaign ?? null,
      fbclid: kept.fbclid ?? null,
      visitorId: visitorId ?? null,
      capturedAt: new Date().toISOString(),
    },
  };
  if (location) patch.lastLoginCountry = location;
  if (deviceLabel) patch.lastLoginDevice = deviceLabel;

  await UserModel.updateOne({ _id: userId }, { $set: patch });
}
