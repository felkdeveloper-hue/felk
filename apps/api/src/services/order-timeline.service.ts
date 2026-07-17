import { OrderTimelineModel } from '@/models/order.models';
import { logger } from '@/config/logger';

export async function recordOrderTimeline(input: {
  orderId: string;
  event: string;
  status?: string | null;
  note?: string | null;
  actorUserId?: string | null;
  actorType?: 'user' | 'system';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await OrderTimelineModel.create({
      orderId: input.orderId,
      event: input.event,
      status: input.status ?? null,
      note: input.note ?? null,
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? (input.actorUserId ? 'user' : 'system'),
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    logger.error(
      { err: error, orderId: input.orderId, event: input.event },
      'Failed to record order timeline',
    );
  }
}
