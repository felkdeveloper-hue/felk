/**
 * Manual one-shot for the same automatic Koko catch-up the API cron runs
 * every 2 minutes. You should not need this on EC2 after deploy.
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
      scannedReferences: result.scannedReferences,
    },
    null,
    2,
  ),
);
process.exit(0);
