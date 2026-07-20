import type { Model, Document } from 'mongoose';
import { logger } from '@/config/logger';

export interface RetrySweepDoc extends Document {
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
}

export type SweepSender<T extends RetrySweepDoc> = (doc: T) => Promise<void>;

const RETRYABLE_STATUSES = ['pending', 'retrying'];
const MAX_BATCH = 50;

function nextBackoffDate(attempts: number): Date {
  const delayMs = Math.min(500 * 2 ** attempts, 30 * 60 * 1000);
  return new Date(Date.now() + delayMs);
}

/**
 * Generic Mongo-backed retry sweep.
 * Fetches up to `MAX_BATCH` documents that are pending/retrying and due for another attempt,
 * invokes `sender`, and marks them sent or failed accordingly.
 */
export async function sweepPending<T extends RetrySweepDoc>(
  model: Model<T>,
  sender: SweepSender<T>,
  label: string,
): Promise<void> {
  const now = new Date();
  const rawDocs = (await model
    .find({
      status: { $in: RETRYABLE_STATUSES },
      $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    })
    .limit(MAX_BATCH)
    .lean()
    .exec()) as Array<{ _id: unknown }>;

  if (!rawDocs.length) return;

  logger.debug({ label, count: rawDocs.length }, `${label} retry sweep: processing`);

  await Promise.allSettled(
    rawDocs.map(async (rawDoc) => {
      const doc = await model.findById(rawDoc._id);
      if (!doc) return;

      doc.attempts = (doc.attempts ?? 0) + 1;

      try {
        await sender(doc);
        doc.set('status', 'sent');
        doc.set('sentAt', new Date());
        doc.set('lastError', null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn(
          { label, id: doc._id, attempts: doc.attempts, err: errMsg },
          `${label} retry failed`,
        );

        if (doc.attempts >= doc.maxAttempts) {
          doc.set('status', 'failed');
          doc.set('lastError', errMsg);
        } else {
          doc.set('status', 'retrying');
          doc.set('lastError', errMsg);
          doc.set('nextAttemptAt', nextBackoffDate(doc.attempts));
        }
      }

      await doc.save();
    }),
  );
}
