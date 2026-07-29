import { OrderEventModel } from '@/models/order.models.js';
import type { OrderEventType } from '@/constants/order.js';
import { domainEventBus } from '@/services/events/event-bus.js';
import { logger } from '@/config/logger.js';

/**
 * Publish-only outbox for Order Management domain events. Nothing in this
 * codebase consumes these yet — a future Shipping module would subscribe to
 * `OrderCreated` the same way Order Management subscribes to
 * `PaymentSucceeded` today.
 */
export async function publishOrderEvent(
  type: OrderEventType,
  payload: Record<string, unknown>,
  refs?: { orderId?: string; paymentId?: string },
): Promise<void> {
  try {
    await OrderEventModel.create({
      type,
      orderId: refs?.orderId ?? null,
      paymentId: refs?.paymentId ?? null,
      payload,
      publishedAt: new Date(),
    });
    logger.info({ type, ...refs }, `Published order event: ${type}`);
    domainEventBus.publish(type, payload, refs);
  } catch (error) {
    logger.error({ err: error, type }, 'Failed to publish order event');
  }
}
