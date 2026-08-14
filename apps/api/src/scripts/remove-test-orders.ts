/**
 * Soft-delete the three TEST checkout orders so they disappear from admin,
 * analytics revenue, invoices, and customer-facing lists.
 *
 * Usage (from apps/api): pnpm exec tsx src/scripts/remove-test-orders.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import { InvoiceModel, OrderModel } from '@/models/order.models.js';

const TEST_ORDER_NUMBERS = ['ORD-MS06RO1Q-C840D3', 'ORD-MRZF13DD-2B483D', 'ORD-MRZDLC8E-4E80B2'];

await connectDatabase();

const now = new Date();
const orders = await OrderModel.find({
  $or: [
    { orderNumber: { $in: TEST_ORDER_NUMBERS } },
    {
      'shippingAddress.fullName': /^test$/i,
      'shippingAddress.phone': { $in: ['9434343434', '+9434343434'] },
    },
  ],
  isDeleted: { $ne: true },
})
  .select('_id orderNumber')
  .lean();

const ids = orders.map((order) => order._id);

const orderResult = await OrderModel.updateMany(
  { _id: { $in: ids } },
  { $set: { isDeleted: true, deletedAt: now } },
);

const invoiceResult =
  ids.length > 0 ? await InvoiceModel.deleteMany({ orderId: { $in: ids } }) : { deletedCount: 0 };

logger.info(
  {
    matched: orders.map((order) => order.orderNumber),
    ordersSoftDeleted: orderResult.modifiedCount,
    invoicesRemoved: invoiceResult.deletedCount,
  },
  'Removed TEST orders',
);

console.log(
  JSON.stringify(
    {
      matched: orders.map((order) => order.orderNumber),
      ordersSoftDeleted: orderResult.modifiedCount,
      invoicesRemoved: invoiceResult.deletedCount,
    },
    null,
    2,
  ),
);

process.exit(0);
