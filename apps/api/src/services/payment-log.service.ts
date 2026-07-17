import { PaymentLogModel } from '@/models/payment.models';
import { logger } from '@/config/logger';

export async function writePaymentLog(input: {
  paymentId: string;
  action: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await PaymentLogModel.create({
      paymentId: input.paymentId,
      action: input.action,
      message: input.message,
      level: input.level ?? 'info',
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'Failed to write payment log');
  }
}
