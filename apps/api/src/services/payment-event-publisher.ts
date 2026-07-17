import { PaymentEventModel } from '@/models/payment.models';
import type { PaymentEventType } from '@/constants/payment';
import { domainEventBus } from '@/services/events/event-bus';
import { logger } from '@/config/logger';

/**
 * Publish-only outbox for Payment Engine domain events.
 * Nothing in this codebase consumes these — a future subscriber (notifications,
 * analytics, a future Orders module) can tail the `payment_events` collection.
 */
export async function publishPaymentEvent(
  type: PaymentEventType,
  payload: Record<string, unknown>,
  refs?: { paymentId?: string; checkoutId?: string },
): Promise<void> {
  try {
    await PaymentEventModel.create({
      type,
      paymentId: refs?.paymentId ?? null,
      checkoutId: refs?.checkoutId ?? null,
      payload,
      publishedAt: new Date(),
    });
    logger.info({ type, ...refs }, `Published payment event: ${type}`);
    domainEventBus.publish(type, payload, refs);
  } catch (error) {
    logger.error({ err: error, type }, 'Failed to publish payment event');
  }
}
