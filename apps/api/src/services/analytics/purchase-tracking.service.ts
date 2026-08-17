import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { CheckoutSessionModel } from '@/models/checkout.models.js';
import { OrderModel } from '@/models/order.models.js';
import { PaymentModel } from '@/models/payment.models.js';
import { AnalyticsEventLogModel } from '@/models/analytics.model.js';
import { analyticsService } from '@/services/analytics/analytics.service.js';
import {
  buildMetaContentsFromLines,
  purchaseEventId,
} from '@/services/analytics/meta-tracking.helpers.js';
import { customerService } from '@/services/customer.service.js';
import type { CheckoutSessionDocument } from '@/models/checkout.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import type { PaymentDocument } from '@/models/payment.models.js';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 11000
  );
}

/** Send Meta/TikTok Purchase after an order is successfully created. */
export async function trackMetaPurchaseForOrder(
  payment: PaymentDocument,
  order: Pick<OrderDocument, 'orderNumber' | 'items'>,
  checkout?: Pick<CheckoutSessionDocument, 'shippingAddress'> | null,
): Promise<void> {
  const eventId = purchaseEventId(order.orderNumber);

  const alreadySent = await AnalyticsEventLogModel.exists({
    provider: 'meta',
    eventId,
    eventName: 'Purchase',
    status: 'sent',
  });
  if (alreadySent) {
    logger.debug({ eventId, orderNumber: order.orderNumber }, 'Meta Purchase: already sent');
    return;
  }

  try {
    const customer = await customerService.getById(payment.customerId.toString()).catch(() => null);
    const { contentIds, contents, numItems } = buildMetaContentsFromLines(
      order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        unitPrice: item.salePrice ?? item.price,
      })),
    );
    const shipping = (checkout?.shippingAddress ?? {}) as Record<string, unknown>;
    const eventSourceUrl = `${appConfig.email.shopUrl.replace(/\/$/, '')}/checkout/success?checkoutToken=${encodeURIComponent(payment.checkoutToken)}`;

    await analyticsService.trackPurchase({
      orderId: order.orderNumber,
      currency: payment.currency,
      value: payment.amount,
      contentIds,
      contents,
      numItems,
      eventId,
      eventSourceUrl,
      userData: customer
        ? {
            email: (customer as { email?: string }).email ?? null,
            phone:
              (customer as { phone?: string | null }).phone ??
              (typeof shipping.phone === 'string' ? shipping.phone : null),
            firstName: (customer as { firstName?: string | null }).firstName ?? null,
            lastName: (customer as { lastName?: string | null }).lastName ?? null,
            city: typeof shipping.city === 'string' ? shipping.city : null,
            country:
              typeof shipping.country === 'string'
                ? shipping.country
                : ((customer as { country?: string | null }).country ?? null),
            externalId: payment.customerId.toString(),
          }
        : undefined,
    });

    logger.info({ eventId, orderNumber: order.orderNumber }, 'Meta Purchase: tracked');
  } catch (error) {
    logger.warn(
      { err: error, eventId, orderNumber: order.orderNumber },
      'Meta Purchase: tracking failed',
    );
  }
}

/** Idempotent Purchase tracking — safe to call from status polls and webhooks. */
export async function ensureMetaPurchaseTracked(paymentId: string): Promise<boolean> {
  const order = await OrderModel.findOne({ paymentId, isDeleted: false });
  if (!order) return false;

  const payment = await PaymentModel.findOne({ _id: paymentId, isDeleted: false });
  if (!payment) return false;

  const checkout = await CheckoutSessionModel.findById(order.checkoutId).lean();
  await trackMetaPurchaseForOrder(payment, order, checkout);
  return true;
}

/** Replay Purchase for an existing order (test / backfill). */
export async function replayMetaPurchaseForOrderNumber(orderNumber: string): Promise<boolean> {
  const order = await OrderModel.findOne({ orderNumber, isDeleted: false });
  if (!order?.paymentId) return false;
  return ensureMetaPurchaseTracked(order.paymentId.toString());
}
