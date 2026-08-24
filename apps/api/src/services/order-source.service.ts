import { Types } from 'mongoose';
import { CustomerModel } from '@/models/customer.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import {
  resolveUserAttributions,
  type ResolvedUserAttribution,
} from '@/services/platform-analytics/resolve-user-attribution.service.js';
import type { AttributionDisplay } from '@/services/platform-analytics/source-attribution.util.js';

export type OrderSource = AttributionDisplay;

export const UNKNOWN_ORDER_SOURCE: OrderSource = {
  label: 'Unknown',
  channel: 'Unknown',
  detail: 'No visit data for this customer',
};

const UNKNOWN = UNKNOWN_ORDER_SOURCE;

export async function resolveOrderSource(order: OrderDocument): Promise<OrderSource> {
  const sources = await resolveOrderSources([order]);
  return sources.get(String(order._id)) ?? UNKNOWN;
}

/** Batch lookup for order lists — same attribution rules as Users admin. */
export async function resolveOrderSources(
  orders: OrderDocument[],
): Promise<Map<string, OrderSource>> {
  const result = new Map<string, OrderSource>();
  if (!orders.length) return result;

  const orderIdsByUser = new Map<string, string[]>();
  const missingCustomerIds: string[] = [];

  for (const order of orders) {
    const orderId = String(order._id);
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

  const attributions = await resolveUserAttributions(userIds, {
    persistMissingAcquisition: true,
  });

  for (const userId of userIds) {
    const resolved: ResolvedUserAttribution | undefined = attributions.get(userId);
    const source = resolved?.display ?? UNKNOWN;
    for (const orderId of orderIdsByUser.get(userId) ?? []) {
      result.set(orderId, source.label === 'Unknown' || !source.label ? UNKNOWN : source);
    }
  }

  return result;
}
