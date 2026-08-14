/**
 * Create missing admin orders for Koko payments that already succeeded
 * on Paykoko but never got a verified webhook.
 *
 * Usage (from apps/api): pnpm exec tsx src/scripts/recover-koko-orders.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import { recoverConfirmedKokoOrders } from '@/services/order-payment-consumer.service.js';

await connectDatabase();
const result = await recoverConfirmedKokoOrders();
logger.info(result, 'Koko order recovery finished');
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
