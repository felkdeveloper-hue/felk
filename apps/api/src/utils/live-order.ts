import { OrderModel } from '@/models/order.models.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import type { Types } from 'mongoose';

const LIVE_ORDER_FILTER = {
  isDeleted: false,
  status: { $ne: ORDER_STATUS.CANCELLED },
} as const;

export async function findLiveOrderForPayment(paymentId: Types.ObjectId | string) {
  return OrderModel.findOne({ paymentId, ...LIVE_ORDER_FILTER });
}

export async function liveOrderExistsForPayment(
  paymentId: Types.ObjectId | string,
): Promise<boolean> {
  return Boolean(await OrderModel.exists({ paymentId, ...LIVE_ORDER_FILTER }));
}

export async function liveOrderExistsForCheckout(
  checkoutId: Types.ObjectId | string,
): Promise<boolean> {
  return Boolean(await OrderModel.exists({ checkoutId, ...LIVE_ORDER_FILTER }));
}
