import { VisitorModel, SessionModel } from '@/models/analytics/index.js';
import { CustomerModel } from '@/models/customer.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import {
  formatAttribution,
  type AttributionDisplay,
} from '@/services/platform-analytics/source-attribution.util.js';

export type OrderSource = AttributionDisplay;

const UNKNOWN: OrderSource = {
  label: 'Unknown',
  channel: 'Unknown',
  detail: 'No visit data for this customer',
};

async function resolveUserId(order: OrderDocument): Promise<string | null> {
  if (order.userId) return String(order.userId);
  const customer = await CustomerModel.findById(order.customerId).select('userId').lean();
  return customer?.userId ? String(customer.userId) : null;
}

export async function resolveOrderSource(order: OrderDocument): Promise<OrderSource> {
  const userId = await resolveUserId(order);
  if (!userId) return UNKNOWN;

  const placedAt = order.placedAt ?? order.createdAt ?? new Date();

  const visitor = await VisitorModel.findOne({ userId })
    .sort({ lastSeenAt: -1 })
    .select('trafficSource referrer utmSource utmMedium utmCampaign')
    .lean();

  if (visitor) {
    return formatAttribution({
      trafficSource: visitor.trafficSource || 'direct',
      referrer: visitor.referrer,
      utmSource: visitor.utmSource,
      utmMedium: visitor.utmMedium,
      utmCampaign: visitor.utmCampaign,
    });
  }

  const session = await SessionModel.findOne({
    userId,
    startedAt: { $lte: placedAt },
  })
    .sort({ startedAt: -1 })
    .select('trafficSource visitorId')
    .lean();

  if (!session) {
    const anySession = await SessionModel.findOne({ userId })
      .sort({ startedAt: -1 })
      .select('trafficSource')
      .lean();
    if (!anySession) return UNKNOWN;
    return formatAttribution({ trafficSource: anySession.trafficSource || 'direct' });
  }

  const sessionVisitor = session.visitorId
    ? await VisitorModel.findOne({ visitorId: session.visitorId })
        .select('trafficSource referrer utmSource utmMedium utmCampaign')
        .lean()
    : null;

  return formatAttribution({
    trafficSource: sessionVisitor?.trafficSource || session.trafficSource || 'direct',
    referrer: sessionVisitor?.referrer,
    utmSource: sessionVisitor?.utmSource,
    utmMedium: sessionVisitor?.utmMedium,
    utmCampaign: sessionVisitor?.utmCampaign,
  });
}
