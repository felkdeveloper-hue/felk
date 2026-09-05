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
  return Boolean(
    await AnalyticsEventLogModel.exists({
      provider: 'meta',
      eventId,
      eventName: 'Purchase',
      status: 'sent',
    }),
  );
}

type MetaClickContext = {
  fbp?: string;
  fbc?: string;
  ipAddress?: string;
  userAgent?: string;
};

function readMetaClick(
  checkout?: Pick<CheckoutSessionDocument, 'metadata'> | null,
): MetaClickContext {
  const raw = checkout?.metadata?.metaClick;
  if (!raw || typeof raw !== 'object') return {};
  const click = raw as Record<string, unknown>;
  return {
    ...(typeof click.fbp === 'string' && click.fbp ? { fbp: click.fbp } : {}),
    ...(typeof click.fbc === 'string' && click.fbc ? { fbc: click.fbc } : {}),
    ...(typeof click.ipAddress === 'string' && click.ipAddress
      ? { ipAddress: click.ipAddress }
      : {}),
    ...(typeof click.userAgent === 'string' && click.userAgent
      ? { userAgent: click.userAgent }
      : {}),
  };
}

function extractCheckoutToken(eventId?: string, url?: string): string | null {
  if (eventId?.startsWith('checkout-')) {
    const token = eventId.slice('checkout-'.length).trim();
    return token || null;
  }
  if (!url) return null;
  try {
    return new URL(url).searchParams.get('checkoutToken');
  } catch {
    return null;
  }
}

/** Persist browser click IDs from checkout so server Purchase can match ads. */
export async function captureMetaClickContext(input: {
  eventId?: string;
  url?: string;
  fbp?: string | null;
  fbc?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const token = extractCheckoutToken(input.eventId, input.url);
  if (!token) return;
  if (!input.fbp && !input.fbc && !input.ipAddress && !input.userAgent) return;

  try {
    const session = await CheckoutSessionModel.findOne({ checkoutToken: token })
      .select('metadata')
      .lean();
    if (!session) return;

    const existing = readMetaClick(session);
    await CheckoutSessionModel.updateOne(
      { checkoutToken: token },
      {
        $set: {
          'metadata.metaClick': {
            ...existing,
            ...(input.fbp ? { fbp: input.fbp } : {}),
            ...(input.fbc ? { fbc: input.fbc } : {}),
            ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
            ...(input.userAgent ? { userAgent: input.userAgent } : {}),
            updatedAt: new Date().toISOString(),
          },
        },
      },
    );
  } catch (error) {
    logger.debug({ err: error }, 'Meta click context capture skipped');
  }
}

function toUnixSeconds(value: unknown): number | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Math.floor(value.getTime() / 1000);
  }
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return Math.floor(parsed.getTime() / 1000);
  }
  return undefined;
}

function resolvePurchaseEventTime(
  payment: Pick<PaymentDocument, 'paidAt'>,
  order: Pick<OrderDocument, 'paidAt' | 'placedAt' | 'createdAt'>,
): number {
  return (
    toUnixSeconds(payment.paidAt) ??
    toUnixSeconds(order.paidAt) ??
    toUnixSeconds(order.placedAt) ??
    toUnixSeconds(order.createdAt) ??
    Math.floor(Date.now() / 1000)
  );
}

/** Send Meta Purchase after an order is successfully created. Returns true when Meta accepted the event. */
export async function trackMetaPurchaseForOrder(
  payment: PaymentDocument,
  order: Pick<OrderDocument, 'orderNumber' | 'items' | 'paidAt' | 'placedAt' | 'createdAt'>,
  checkout?: Pick<CheckoutSessionDocument, 'shippingAddress' | 'metadata'> | null,
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
    const click = readMetaClick(checkout);
    const eventSourceUrl = `${appConfig.email.shopUrl.replace(/\/$/, '')}/checkout/success?checkoutToken=${encodeURIComponent(payment.checkoutToken)}`;
    const customerRecord = customer as {
      email?: string;
      phone?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      country?: string | null;
      dateOfBirth?: Date | null;
      gender?: string | null;
    } | null;

    const metaResponse = await metaCapiService.trackPurchase({
      orderId: order.orderNumber,
      currency: payment.currency,
      value: payment.amount,
      contentIds,
      contents,
      numItems,
      eventId,
      eventTime: resolvePurchaseEventTime(payment, order),
      eventSourceUrl,
      userData: {
        email: customerRecord?.email ?? null,
        phone:
          customerRecord?.phone ?? (typeof shipping.phone === 'string' ? shipping.phone : null),
        firstName: customerRecord?.firstName ?? null,
        lastName: customerRecord?.lastName ?? null,
        city: typeof shipping.city === 'string' ? shipping.city : null,
        state: typeof shipping.state === 'string' ? shipping.state : null,
        zip: typeof shipping.postalCode === 'string' ? shipping.postalCode : null,
        dateOfBirth: customerRecord?.dateOfBirth ?? null,
        gender: customerRecord?.gender ?? null,
        country:
          typeof shipping.country === 'string'
            ? shipping.country
            : (customerRecord?.country ?? null),
        externalId: payment.customerId.toString(),
        fbp: click.fbp ?? null,
        fbc: click.fbc ?? null,
        ipAddress: click.ipAddress ?? null,
        userAgent: click.userAgent ?? null,
      },
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
  const order = await OrderModel.findOne({ paymentId, isDeleted: { $ne: true } });
  if (!order) return false;

  const payment = await PaymentModel.findOne({ _id: paymentId, isDeleted: { $ne: true } });
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
