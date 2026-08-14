/**
 * Rewrite order.paidAt / order.placedAt from the original payment/checkout time
 * so admin "Received" and revenue buckets are not the Ready-for-shipment date.
 *
 * Usage (from apps/api): pnpm exec tsx src/scripts/backfill-order-received-at.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import { CheckoutSessionModel } from '@/models/checkout.models.js';
import { OrderModel } from '@/models/order.models.js';
import { PaymentAttemptModel, PaymentModel } from '@/models/payment.models.js';
import { earliestDate, paymentReceivedAt } from '@/utils/order-received-at.js';

await connectDatabase();

const orders = await OrderModel.find({ isDeleted: { $ne: true } })
  .select(
    '_id orderNumber paymentId checkoutId paidAt placedAt createdAt readyForShipmentAt totals.grandTotal',
  )
  .lean();

const updated: Array<{
  orderNumber: string;
  from: string | null;
  to: string;
  amount: number;
}> = [];

for (const order of orders) {
  const [payment, checkout, attempt] = await Promise.all([
    order.paymentId
      ? PaymentModel.findById(order.paymentId)
          .select('paidAt createdAt gatewayPaymentId metadata referenceNumber')
          .lean()
      : null,
    order.checkoutId
      ? CheckoutSessionModel.findById(order.checkoutId).select('createdAt').lean()
      : null,
    order.paymentId
      ? PaymentAttemptModel.findOne({ paymentId: order.paymentId })
          .sort({ createdAt: 1 })
          .select('createdAt')
          .lean()
      : null,
  ]);

  const receivedAt = earliestDate(
    paymentReceivedAt(payment ?? {}),
    attempt?.createdAt,
    checkout?.createdAt,
  );
  if (!receivedAt) continue;

  const current = earliestDate(order.paidAt, order.placedAt, order.createdAt);
  if (current && Math.abs(current.getTime() - receivedAt.getTime()) < 60 * 1000) continue;

  await OrderModel.updateOne(
    { _id: order._id },
    { $set: { paidAt: receivedAt, placedAt: receivedAt } },
  );

  if (payment && payment._id) {
    const paidAt = earliestDate(payment.paidAt);
    if (!paidAt || paidAt.getTime() - receivedAt.getTime() > 60 * 1000) {
      await PaymentModel.updateOne({ _id: payment._id }, { $set: { paidAt: receivedAt } });
    }
  }

  updated.push({
    orderNumber: order.orderNumber,
    from: current ? current.toISOString() : null,
    to: receivedAt.toISOString(),
    amount: Number(order.totals?.grandTotal ?? 0),
  });
}

logger.info({ count: updated.length, updated }, 'Backfilled order received dates');
console.log(JSON.stringify({ count: updated.length, updated }, null, 2));
process.exit(0);
