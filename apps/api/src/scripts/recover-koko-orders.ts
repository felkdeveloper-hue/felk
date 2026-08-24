/**
 * Manual one-shot for the same Koko sync the API cron runs every 2 minutes:
 * void unverified auto-orders, then create admin orders only for captured payments.
 *
 * Usage (from apps/api): pnpm exec tsx src/scripts/recover-koko-orders.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import {
  recoverConfirmedKokoOrders,
  voidUnverifiedKokoAutoOrders,
} from '@/services/order-payment-consumer.service.js';

await connectDatabase();
const voided = await voidUnverifiedKokoAutoOrders();
const result = await recoverConfirmedKokoOrders();
logger.info({ voided, result }, 'Koko order recovery finished');
console.log(
  JSON.stringify(
    {
      voided,
      scanned: result.scanned,
      recovered: result.recovered,
      scannedReferences: result.scannedReferences,
    },
    null,
    2,
  ),
);
process.exit(0);
