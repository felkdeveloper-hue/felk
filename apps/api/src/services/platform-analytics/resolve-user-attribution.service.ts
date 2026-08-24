import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import { anonymizeIp } from './geoip.util.js';
import {
  formatAttribution,
  hasAttributionSignal,
  type AttributionDisplay,
} from './source-attribution.util.js';

export type UserAttributionFields = {
  trafficSource?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
};

type VisitorLean = UserAttributionFields & {
  userId?: Types.ObjectId | null;
  geo?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    countryCode?: string | null;
  } | null;
  device?: { type?: string | null } | null;
};

type AcquisitionMeta = {
  sourceLabel?: string | null;
  sourceChannel?: string | null;
  sourceDetail?: string | null;
  trafficSource?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  fbclid?: string | null;
};

export type ResolvedUserAttribution = {
  display: AttributionDisplay | null;
  fields: UserAttributionFields | null;
  geo: VisitorLean['geo'] | null;
  deviceType: string | null;
};

const VISITOR_SELECT =
  'userId ipHash geo device trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource';

function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

function displayFromFields(fields: UserAttributionFields): AttributionDisplay {
  return formatAttribution({
    trafficSource: fields.trafficSource || 'direct',
    referrer: fields.referrer,
    utmSource: fields.utmSource,
    utmMedium: fields.utmMedium,
    utmCampaign: fields.utmCampaign,
    utmContent: fields.utmContent,
    fbclid: fields.fbclid,
    gclid: fields.gclid,
    ttclid: fields.ttclid,
    msclkid: fields.msclkid,
    igshid: fields.igshid,
    inAppSource: fields.inAppSource,
  });
}

function displayFromAcquisition(acq: AcquisitionMeta): AttributionDisplay | null {
  if (acq.sourceLabel?.trim()) {
    return {
      label: acq.sourceLabel.trim(),
      channel: acq.sourceChannel ?? '',
      detail: acq.sourceDetail ?? undefined,
    };
  }
  if (acq.trafficSource || acq.utmSource || acq.fbclid) {
    return displayFromFields({
      trafficSource: acq.trafficSource ?? 'direct',
      utmSource: acq.utmSource,
      utmMedium: acq.utmMedium,
      utmCampaign: acq.utmCampaign,
      fbclid: acq.fbclid,
    });
  }
  return null;
}

function isUsefulDisplay(display: AttributionDisplay | null): boolean {
  if (!display?.label) return false;
  if (display.label === 'Unknown') return false;
  return true;
}

function isNonDirectDisplay(display: AttributionDisplay | null): boolean {
  return Boolean(display && display.label !== 'Direct' && display.label !== 'Unknown');
}

function visitorHasSignal(visitor: UserAttributionFields | null | undefined): boolean {
  if (!visitor) return false;
  return hasAttributionSignal({
    referrer: visitor.referrer,
    utmSource: visitor.utmSource,
    utmMedium: visitor.utmMedium,
    utmCampaign: visitor.utmCampaign,
    utmContent: visitor.utmContent,
    fbclid: visitor.fbclid,
    gclid: visitor.gclid,
    ttclid: visitor.ttclid,
    msclkid: visitor.msclkid,
    igshid: visitor.igshid,
    inAppSource: visitor.inAppSource,
  });
}

/**
 * Resolve real first-touch attribution for many users.
 * Prefer: visitor with signals → saved acquisition → any visitor → IP-matched visitor.
 * Never invents a source — returns null when nothing real exists.
 */
export async function resolveUserAttributions(
  userIds: string[],
  options?: { persistMissingAcquisition?: boolean },
): Promise<Map<string, ResolvedUserAttribution>> {
  const result = new Map<string, ResolvedUserAttribution>();
  const validIds = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
  if (!validIds.length) return result;

  const objectIds = validIds.map((id) => new Types.ObjectId(id));
  const [users, visitors] = await Promise.all([
    UserModel.find({ _id: { $in: objectIds } })
      .select('metadata lastLoginIp')
      .lean(),
    VisitorModel.find({ userId: { $in: objectIds } })
      .sort({ lastSeenAt: -1 })
      .select(VISITOR_SELECT)
      .lean(),
  ]);

  const userById = new Map(users.map((u) => [String(u._id), u] as const));
  const visitorByUser = new Map<string, VisitorLean>();
  for (const visitor of visitors) {
    if (!visitor.userId) continue;
    const id = String(visitor.userId);
    if (!visitorByUser.has(id)) visitorByUser.set(id, visitor as VisitorLean);
  }

  const needIp: string[] = [];
  const userIdsByIpHash = new Map<string, string[]>();

  for (const userId of validIds) {
    const user = userById.get(userId);
    const visitor = visitorByUser.get(userId) ?? null;
    const acq = (user?.metadata as Record<string, unknown> | undefined)?.acquisition as
      AcquisitionMeta | undefined;

    const fromVisitorSignal =
      visitor && visitorHasSignal(visitor) ? displayFromFields(visitor) : null;
    const fromAcq = acq ? displayFromAcquisition(acq) : null;
    const fromVisitorAny = visitor ? displayFromFields(visitor) : null;

    let chosen: AttributionDisplay | null = null;
    let fields: UserAttributionFields | null = null;

    if (isNonDirectDisplay(fromVisitorSignal)) {
      chosen = fromVisitorSignal;
      fields = visitor;
    } else if (isNonDirectDisplay(fromAcq)) {
      chosen = fromAcq;
      fields = acq
        ? {
            trafficSource: acq.trafficSource ?? null,
            utmSource: acq.utmSource ?? null,
            utmMedium: acq.utmMedium ?? null,
            utmCampaign: acq.utmCampaign ?? null,
            fbclid: acq.fbclid ?? null,
          }
        : null;
    } else if (isUsefulDisplay(fromVisitorAny)) {
      chosen = fromVisitorAny;
      fields = visitor;
    } else if (isUsefulDisplay(fromAcq)) {
      chosen = fromAcq;
    }

    if (chosen) {
      result.set(userId, {
        display: chosen,
        fields,
        geo: visitor?.geo ?? null,
        deviceType: visitor?.device?.type ?? null,
      });
      continue;
    }

    const ipHash = hashIp(user?.lastLoginIp as string | null | undefined);
    if (ipHash) {
      needIp.push(ipHash);
      const list = userIdsByIpHash.get(ipHash) ?? [];
      list.push(userId);
      userIdsByIpHash.set(ipHash, list);
    } else {
      result.set(userId, { display: null, fields: null, geo: null, deviceType: null });
    }
  }

  if (needIp.length) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const byIp = await VisitorModel.find({
      ipHash: { $in: [...new Set(needIp)] },
      firstSeenAt: { $gte: ninetyDaysAgo },
      trafficSource: { $exists: true, $nin: ['direct', null, ''] },
    })
      .sort({ firstSeenAt: 1 })
      .select(VISITOR_SELECT)
      .lean();

    const visitorByIp = new Map<string, VisitorLean>();
    for (const visitor of byIp) {
      const key = String((visitor as { ipHash?: string }).ipHash ?? '');
      if (key && !visitorByIp.has(key)) visitorByIp.set(key, visitor as VisitorLean);
    }

    const persistOps: Array<{
      updateOne: {
        filter: { _id: Types.ObjectId };
        update: { $set: Record<string, unknown> };
      };
    }> = [];

    for (const [ipHash, ids] of userIdsByIpHash) {
      const visit = visitorByIp.get(ipHash) ?? null;
      const display = visit ? displayFromFields(visit) : null;
      for (const userId of ids) {
        if (isNonDirectDisplay(display) && visit) {
          result.set(userId, {
            display,
            fields: visit,
            geo: visit.geo ?? null,
            deviceType: visit.device?.type ?? null,
          });
          if (options?.persistMissingAcquisition !== false) {
            const existingAcq = (
              userById.get(userId)?.metadata as Record<string, unknown> | undefined
            )?.acquisition as AcquisitionMeta | undefined;
            if (!existingAcq?.sourceLabel) {
              persistOps.push({
                updateOne: {
                  filter: { _id: new Types.ObjectId(userId) },
                  update: {
                    $set: {
                      'metadata.acquisition': {
                        sourceLabel: display!.label,
                        sourceChannel: display!.channel,
                        sourceDetail: display!.detail ?? null,
                        trafficSource: visit.trafficSource ?? null,
                        utmSource: visit.utmSource ?? null,
                        utmMedium: visit.utmMedium ?? null,
                        utmCampaign: visit.utmCampaign ?? null,
                        fbclid: visit.fbclid ?? null,
                        recoveredFrom: 'ip',
                        capturedAt: new Date().toISOString(),
                      },
                    },
                  },
                },
              });
            }
          }
        } else {
          result.set(userId, { display: null, fields: null, geo: null, deviceType: null });
        }
      }
    }

    if (persistOps.length) {
      void UserModel.bulkWrite(persistOps, { ordered: false }).catch(() => {
        /* best-effort persist */
      });
    }
  }

  for (const userId of validIds) {
    if (!result.has(userId)) {
      result.set(userId, { display: null, fields: null, geo: null, deviceType: null });
    }
  }

  return result;
}
