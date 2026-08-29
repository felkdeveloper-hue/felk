/**
 * Refresh Tinadi's flash window to 20 minutes remaining and retry the queued email.
 * Usage: pnpm exec tsx src/scripts/retry-tinadi-flash-email.ts
 */
import { connectDatabase } from '@/config/database.js';
import { logger } from '@/config/logger.js';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';
import { CustomerModel, EmailLogModel } from '@/models/index.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { resetEmailTransporter } from '@/services/email/transporter.js';

const TARGET_EMAIL = 'pereratinadi@gmail.com';
const MINUTES_LEFT = 20;
const LOG_ID = '6a93133568824259874eb2d5';

await connectDatabase();

const remainingMs = MINUTES_LEFT * 60 * 1000;
const flashSaleStartTime = new Date(Date.now() - (FLASH_SALE_DISCOUNT.DURATION_MS - remainingMs));

const customerUpdate = await CustomerModel.updateOne(
  { email: TARGET_EMAIL, isDeleted: false },
  {
    $set: {
      flashSaleStartTime,
      'metadata.returnFlashSaleBonusPending': true,
      'metadata.returnFlashSaleBonusMs': 15 * 60 * 1000,
    },
  },
);

logger.info(
  {
    matched: customerUpdate.matchedCount,
    modified: customerUpdate.modifiedCount,
    flashSaleStartTime: flashSaleStartTime.toISOString(),
    expiresAt: new Date(
      flashSaleStartTime.getTime() + FLASH_SALE_DISCOUNT.DURATION_MS,
    ).toISOString(),
  },
  'Refreshed Tinadi flash window',
);

const log = await EmailLogModel.findById(LOG_ID);
if (!log) {
  throw new Error(`Email log ${LOG_ID} not found`);
}

resetEmailTransporter();
try {
  await emailQueueService.sendFromLog(log);
  log.set('status', 'sent');
  log.set('lastError', null);
  await log.save();
  logger.info({ logId: LOG_ID, messageId: log.messageId }, 'Tinadi email sent');
} catch (err) {
  const errMsg = err instanceof Error ? err.message : String(err);
  log.status = 'retrying';
  log.lastError = errMsg;
  log.attempts = (log.attempts ?? 0) + 1;
  log.nextAttemptAt = new Date(Date.now() + 30_000);
  await log.save();
  logger.error({ err: errMsg }, 'Tinadi email still failing — left queued for API cron');
}

process.exit(0);
