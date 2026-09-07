import type { Types } from 'mongoose';
import { PaymentAttemptModel } from '@/models/payment.models.js';

/**
 * Every Koko gateway orderId we may have sent for a payment (each attempt + A1..An).
 * Koko can capture on attempt 2 while reconcile only checked attempt 1 — that gap
 * caused paid Koko checkouts to stay "processing" with no admin order.
 */
export async function kokoOrderIdCandidatesForPayment(payment: {
  _id: Types.ObjectId;
  referenceNumber: string;
  attemptCount?: number;
}): Promise<string[]> {
  const attempts = await PaymentAttemptModel.find({ paymentId: payment._id })
    .sort({ attemptNumber: -1 })
    .lean();

  const ids = new Set<string>();
  for (const attempt of attempts) {
    const fromPayload =
      attempt.requestPayload && typeof attempt.requestPayload.orderId === 'string'
        ? attempt.requestPayload.orderId.trim()
        : '';
    if (fromPayload) ids.add(fromPayload);
  }

  const maxAttempt = Math.max(1, payment.attemptCount || 1, attempts.length);
  for (let i = 1; i <= maxAttempt; i += 1) {
    ids.add(`${payment.referenceNumber}-A${i}`);
  }

  return [...ids];
}

/** Koko posted SUCCESS with a transaction id we stored while webhook crypto was inconclusive. */
export function kokoHasStoredSuccessClaim(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) return false;
  const trnId = String(metadata.kokoClaimedTrnId ?? '').trim();
  const status = String(metadata.kokoClaimedStatus ?? '').trim();
  if (trnId.length < 6) return false;
  return /^(SUCCESS|APPROVED|COMPLETED)$/i.test(status);
}
