import { CustomerModel } from '@/models/customer.models.js';
import {
  orderStatusUpdateEmail,
  type NotifiableOrderStatus,
} from '@/emails/templates/order.templates.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { logger } from '@/config/logger.js';
import { appConfig } from '@/config/app.config.js';

const NOTIFIABLE_STATUSES = new Set<string>([
  'confirmed',
  'packed',
  'ready_for_shipment',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'refund_pending',
  'refunded',
]);

interface NotifyOptions {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: string;
  /** Optional human-readable update from the admin to include in the email. */
  updateMessage?: string;
}

/**
 * Sends a status-update notification email to the customer.
 * - Skips statuses not visible to customers (e.g. internal transitions).
 * - Respects `notificationPreferences.orderUpdates`.
 * - Failures are logged but never propagated — the status change has already been committed.
 */
export async function notifyOrderStatusChange(opts: NotifyOptions): Promise<void> {
  if (!NOTIFIABLE_STATUSES.has(opts.status)) return;

  try {
    const customer = await CustomerModel.findById(opts.customerId)
      .select('email firstName notificationPreferences')
      .lean();

    if (!customer) {
      logger.warn({ orderId: opts.orderId }, 'order-notification: customer not found — skipping');
      return;
    }

    if (customer.notificationPreferences?.orderUpdates === false) {
      logger.debug(
        { orderId: opts.orderId, customerId: opts.customerId },
        'order-notification: customer opted out — skipping',
      );
      return;
    }

    const orderUrl = `${appConfig.email.shopUrl}/account/orders/${opts.orderId}`;
    const template = orderStatusUpdateEmail({
      name: customer.firstName || 'Valued Customer',
      orderNumber: opts.orderNumber,
      status: opts.status as NotifiableOrderStatus,
      updateMessage: opts.updateMessage,
      orderUrl,
    });

    await emailQueueService.enqueue({
      to: customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      templateKey: `order_status_${opts.status}`,
    });
  } catch (err) {
    logger.error(
      { err, orderId: opts.orderId, status: opts.status },
      'order-notification: failed to queue status email — continuing',
    );
  }
}
