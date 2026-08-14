/**
 * Create missing admin orders for Mintpay purchases that already paid
 * (merchant portal Received) but never got a browser-return callback.
 *
 * Usage (from apps/api): pnpm exec tsx src/scripts/recover-mintpay-orders.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import { recoverConfirmedMintpayOrders } from '@/services/order-payment-consumer.service.js';

await connectDatabase();
const result = await recoverConfirmedMintpayOrders();
logger.info(result, 'Mintpay order recovery finished');
console.log(
  JSON.stringify(
    {
      scanned: result.scanned,
      recovered: result.recovered,
    },
    null,
    2,
  ),
);
process.exit(0);
