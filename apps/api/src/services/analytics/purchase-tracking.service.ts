import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { CheckoutSessionModel } from '@/models/checkout.models.js';
import { OrderModel } from '@/models/order.models.js';
import { PaymentModel } from '@/models/payment.models.js';
import { AnalyticsEventLogModel } from '@/models/analytics.model.js';
import { metaCapiService } from '@/services/analytics/meta-capi.service.js';
import {
  buildMetaContentsFromLines,
  purchaseEventId,
} from '@/services/analytics/meta-tracking.helpers.js';
import { customerService } from '@/services/customer.service.js';
import type { CheckoutSessionDocument } from '@/models/checkout.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import type { PaymentDocument } from '@/models/payment.models.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findOrderByNumber(orderNumber: string) {
  const trimmed = orderNumber.trim();
  if (!trimmed) return null;

  return OrderModel.findOne({
    orderNumber: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
    isDeleted: { $ne: true },
  });
}

async function clearPurchaseLog(eventId: string): Promise<void> {
  await AnalyticsEventLogModel.deleteMany({
    provider: 'meta',
    eventId,
    eventName: 'Purchase',
  });
}

async function purchaseAlreadyAccepted(eventId: string): Promise<boolean> {
  const existing = await AnalyticsEventLogModel.findOne({
    provider: 'meta',
    eventId,
    eventName: 'Purchase',
    status: 'sent',
  });
  if (!existing) return false;

  const payload = existing.payload as { metaResponse?: { events_received?: number } } | undefined;
  const received = payload?.metaResponse?.events_received;
  if (received !== undefined && received < 1) {
    await clearPurchaseLog(eventId);
    return false;
  }

  return true;
}

/** Send Meta Purchase after an order is successfully created. Returns true when Meta accepted the event. */
export async function trackMetaPurchaseForOrder(
  payment: PaymentDocument,
  order: Pick<OrderDocument, 'orderNumber' | 'items'>,
  checkout?: Pick<CheckoutSessionDocument, 'shippingAddress'> | null,
): Promise<boolean> {
  const eventId = purchaseEventId(order.orderNumber);

  if (await purchaseAlreadyAccepted(eventId)) {
    logger.debug({ eventId, orderNumber: order.orderNumber }, 'Meta Purchase: already sent');
    return true;
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

    const metaResponse = await metaCapiService.trackPurchase({
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

    logger.info(
      { eventId, orderNumber: order.orderNumber, fbtrace_id: metaResponse.fbtrace_id },
      'Meta Purchase: tracked',
    );
    return true;
  } catch (error) {
    logger.warn(
      { err: error, eventId, orderNumber: order.orderNumber },
      'Meta Purchase: tracking failed',
    );
    return false;
  }
}

/** Idempotent Purchase tracking — safe to call from status polls and webhooks. */
export async function ensureMetaPurchaseTracked(paymentId: string): Promise<boolean> {
  const order = await OrderModel.findOne({ paymentId, isDeleted: false });
  if (!order) return false;

  const payment = await PaymentModel.findOne({ _id: paymentId, isDeleted: false });
  if (!payment) return false;

  const checkout = await CheckoutSessionModel.findById(order.checkoutId).lean();
  return trackMetaPurchaseForOrder(payment, order, checkout);
}

/** Replay Purchase for an existing order (test / backfill). */
export async function replayMetaPurchaseForOrderNumber(
  orderNumber: string,
  options?: { force?: boolean },
): Promise<'not_found' | 'sent' | 'failed'> {
  const order = await findOrderByNumber(orderNumber);
  if (!order?.paymentId) return 'not_found';

  if (options?.force) {
    await clearPurchaseLog(purchaseEventId(order.orderNumber));
  }

  const sent = await ensureMetaPurchaseTracked(order.paymentId.toString());
  return sent ? 'sent' : 'failed';
}

/** Replay Purchase for the most recent order (test / backfill). */
export async function replayLatestMetaPurchase(options?: {
  force?: boolean;
}): Promise<{ orderNumber: string; sent: boolean } | null> {
  const order = await OrderModel.findOne({
    isDeleted: { $ne: true },
    paymentId: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .select('orderNumber paymentId');

  if (!order?.paymentId) return null;

  const sent = await replayMetaPurchaseForOrderNumber(order.orderNumber, options);
  return { orderNumber: order.orderNumber, sent: sent === 'sent' };
}

/** Send a synthetic Purchase directly to Meta (test mode verification). */
export async function sendTestMetaPurchase(input?: {
  value?: number;
  currency?: string;
}): Promise<{ eventId: string; fbtrace_id?: string; events_received?: number }> {
  const eventId = `test-purchase-${Date.now()}`;
  const value = input?.value ?? 100;
  const currency = input?.currency ?? 'LKR';
  const shopUrl = appConfig.email.shopUrl.replace(/\/$/, '');

  const metaResponse = await metaCapiService.trackPurchase({
    orderId: `TEST-${Date.now()}`,
    currency,
    value,
    contentIds: ['test-product-1'],
    contents: [{ id: 'test-product-1', quantity: 1, item_price: value }],
    numItems: 1,
    eventId,
    eventSourceUrl: `${shopUrl}/checkout/success?test=1`,
    userData: {
      ipAddress: '127.0.0.1',
      userAgent: 'FelkMetaTest/1.0',
    },
  });

  return {
    eventId,
    fbtrace_id: metaResponse.fbtrace_id,
    events_received: metaResponse.events_received,
  };
}

/** Inspect Meta Purchase log for an order (debug). */
export async function getMetaPurchaseStatus(orderNumber: string) {
  const order = await findOrderByNumber(orderNumber);
  if (!order) return null;

  const eventId = purchaseEventId(order.orderNumber);
  const log = await AnalyticsEventLogModel.findOne({
    provider: 'meta',
    eventId,
    eventName: 'Purchase',
  }).lean();

  return {
    orderNumber: order.orderNumber,
    eventId,
    log: log
      ? {
          status: log.status,
          lastError: log.lastError,
          sentAt: log.sentAt,
          attempts: log.attempts,
        }
      : null,
  };
}
