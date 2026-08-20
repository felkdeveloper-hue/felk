import { Types } from 'mongoose';
import { VisitorModel, SessionModel } from '@/models/analytics/index.js';
import { CustomerModel } from '@/models/customer.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import {
  formatAttribution,
  type AttributionDisplay,
} from '@/services/platform-analytics/source-attribution.util.js';

export type OrderSource = AttributionDisplay;

export const UNKNOWN_ORDER_SOURCE: OrderSource = {
  label: 'Unknown',
  channel: 'Unknown',
  detail: 'No visit data for this customer',
};

const UNKNOWN = UNKNOWN_ORDER_SOURCE;

type AttributionFields = {
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

function sourceFrom(fields: AttributionFields): OrderSource {
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

export async function resolveOrderSource(order: OrderDocument): Promise<OrderSource> {
  const sources = await resolveOrderSources([order]);
  return sources.get(String(order._id)) ?? UNKNOWN;
}

/** Batch lookup for order lists — avoids N+1 visitor/session queries. */
export async function resolveOrderSources(
  orders: OrderDocument[],
): Promise<Map<string, OrderSource>> {
  const result = new Map<string, OrderSource>();
  if (!orders.length) return result;

  const orderById = new Map<string, OrderDocument>();
  const orderIdsByUser = new Map<string, string[]>();
  const missingCustomerIds: string[] = [];

  for (const order of orders) {
    const orderId = String(order._id);
    orderById.set(orderId, order);
    if (order.userId) {
      const userId = String(order.userId);
      const ids = orderIdsByUser.get(userId) ?? [];
      ids.push(orderId);
      orderIdsByUser.set(userId, ids);
    } else if (order.customerId) {
      missingCustomerIds.push(String(order.customerId));
    } else {
      result.set(orderId, UNKNOWN);
    }
  }

  if (missingCustomerIds.length) {
    const customers = await CustomerModel.find({ _id: { $in: missingCustomerIds } })
      .select('userId')
      .lean();
    const userByCustomer = new Map(
      customers.map((customer) => [
        String(customer._id),
        customer.userId ? String(customer.userId) : null,
      ]),
    );
    for (const order of orders) {
      if (order.userId) continue;
      const orderId = String(order._id);
      const userId = userByCustomer.get(String(order.customerId));
      if (!userId) {
        result.set(orderId, UNKNOWN);
        continue;
      }
      const ids = orderIdsByUser.get(userId) ?? [];
      ids.push(orderId);
      orderIdsByUser.set(userId, ids);
    }
  }

  const userIds = [...orderIdsByUser.keys()].filter((id) => Types.ObjectId.isValid(id));
  if (!userIds.length) return result;

  const userObjectIds = userIds.map((id) => new Types.ObjectId(id));
  const visitors = await VisitorModel.find({ userId: { $in: userObjectIds } })
    .sort({ lastSeenAt: -1 })
    .select(
      'userId trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource',
    )
    .lean();

  const visitorByUser = new Map<string, (typeof visitors)[number]>();
  for (const visitor of visitors) {
    if (!visitor.userId) continue;
    const userId = String(visitor.userId);
    if (!visitorByUser.has(userId)) visitorByUser.set(userId, visitor);
  }

  const unresolvedUserIds: string[] = [];
  for (const userId of userIds) {
    const visitor = visitorByUser.get(userId);
    const orderIds = orderIdsByUser.get(userId) ?? [];
    if (visitor) {
      const source = sourceFrom(visitor);
      for (const orderId of orderIds) result.set(orderId, source);
    } else {
      unresolvedUserIds.push(userId);
    }
  }

  if (!unresolvedUserIds.length) return result;

  const sessions = await SessionModel.find({
    userId: { $in: unresolvedUserIds.map((id) => new Types.ObjectId(id)) },
  })
    .sort({ startedAt: -1 })
    .select('userId startedAt trafficSource visitorId')
    .lean();

  const sessionsByUser = new Map<string, typeof sessions>();
  for (const session of sessions) {
    if (!session.userId) continue;
    const userId = String(session.userId);
    const list = sessionsByUser.get(userId) ?? [];
    list.push(session);
    sessionsByUser.set(userId, list);
  }

  const visitorIds = new Set<string>();
  const sessionByOrder = new Map<string, (typeof sessions)[number] | null>();
  for (const userId of unresolvedUserIds) {
    const userSessions = sessionsByUser.get(userId) ?? [];
    for (const orderId of orderIdsByUser.get(userId) ?? []) {
      const order = orderById.get(orderId);
      const placedAt = order?.placedAt ?? order?.createdAt ?? new Date();
      const session =
        userSessions.find((item) => item.startedAt && item.startedAt <= placedAt) ??
        userSessions[0] ??
        null;
      sessionByOrder.set(orderId, session);
      if (session?.visitorId) visitorIds.add(session.visitorId);
    }
  }

  const sessionVisitors = visitorIds.size
    ? await VisitorModel.find({ visitorId: { $in: [...visitorIds] } })
        .select(
          'visitorId trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource',
        )
        .lean()
    : [];
  const visitorByVisitorId = new Map(
    sessionVisitors.map((visitor) => [visitor.visitorId, visitor] as const),
  );

  for (const [orderId, session] of sessionByOrder) {
    if (!session) {
      result.set(orderId, UNKNOWN);
      continue;
    }
    const sessionVisitor = session.visitorId
      ? (visitorByVisitorId.get(session.visitorId) ?? null)
      : null;
    result.set(
      orderId,
      sourceFrom({
        trafficSource: sessionVisitor?.trafficSource || session.trafficSource || 'direct',
        referrer: sessionVisitor?.referrer,
        utmSource: sessionVisitor?.utmSource,
        utmMedium: sessionVisitor?.utmMedium,
        utmCampaign: sessionVisitor?.utmCampaign,
        utmContent: sessionVisitor?.utmContent,
        fbclid: sessionVisitor?.fbclid,
        gclid: sessionVisitor?.gclid,
        ttclid: sessionVisitor?.ttclid,
        msclkid: sessionVisitor?.msclkid,
        igshid: sessionVisitor?.igshid,
        inAppSource: sessionVisitor?.inAppSource,
      }),
    );
  }

  return result;
}
