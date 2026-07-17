import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { OrderModel, type OrderItemSubdocument } from '@/models/order.models';
import { PaymentModel, PaymentEventModel } from '@/models/payment.models';
import { CheckoutSessionModel, type CheckoutSessionDocument } from '@/models/checkout.models';
import { ProductModel, ProductVariantModel, ProductMediaModel } from '@/models/product.models';
import { reservationService } from '@/services/reservation.service';
import { invoiceService } from '@/services/invoice.service';
import { recordOrderTimeline } from '@/services/order-timeline.service';
import { publishOrderEvent } from '@/services/order-event-publisher';
import { writeAuditLog } from '@/services/audit.service';
import { domainEventBus } from '@/services/events/event-bus';
import type { ActorMeta } from '@/services/cms-crud.service';
import { logger } from '@/config/logger';
import { ORDER_STATUS } from '@/constants/order-status';
import { ORDER_AUDIT, ORDER_EVENT_TYPE, CONSUMED_PAYMENT_EVENT_TYPES } from '@/constants/order';

const SYSTEM_ACTOR: ActorMeta = {};
const PAYMENT_SUCCEEDED = CONSUMED_PAYMENT_EVENT_TYPES[0];

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function newOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  return `ORD-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: number }).code === 11000,
  );
}

async function buildOrderItems(checkout: CheckoutSessionDocument): Promise<OrderItemSubdocument[]> {
  const variantIds = [...new Set(checkout.lines.map((l) => l.variantId.toString()))];
  const [variants, products] = await Promise.all([
    ProductVariantModel.find({ _id: { $in: variantIds } }),
    ProductModel.find({
      _id: { $in: [...new Set(checkout.lines.map((l) => l.productId.toString()))] },
    }),
  ]);

  const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const primaryImageIds = variants
    .map((v) => v.primaryImageId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const media = primaryImageIds.length
    ? await ProductMediaModel.find({ _id: { $in: primaryImageIds } })
    : [];
  const mediaMap = new Map(media.map((m) => [m._id.toString(), m as unknown as { url: string }]));

  const subtotal = checkout.totals.subtotal || 1;

  return checkout.lines.map((line) => {
    const variant = variantMap.get(line.variantId.toString());
    const product = productMap.get(line.productId.toString());
    const primaryImage = variant?.primaryImageId
      ? mediaMap.get(variant.primaryImageId.toString())?.url
      : undefined;
    const images = [primaryImage, variant?.thumbnailUrl ?? undefined].filter((u): u is string =>
      Boolean(u),
    );

    const weight = checkout.totals.subtotal ? line.lineSubtotal / subtotal : 0;
    const discount = Number((checkout.totals.discount * weight).toFixed(2));
    const tax = Number((checkout.totals.tax * weight).toFixed(2));
    const shipping = Number((checkout.totals.shipping * weight).toFixed(2));
    const lineTotal = Number((line.lineSubtotal - discount + tax + shipping).toFixed(2));

    return {
      _id: new Types.ObjectId(),
      productId: line.productId,
      variantId: line.variantId,
      name: product?.name ?? line.title,
      variantTitle: variant?.title ?? line.title,
      sku: line.sku,
      barcode: variant?.barcode ?? null,
      images: [...new Set(images)],
      price: line.unitPrice,
      salePrice: line.salePrice ?? null,
      discount,
      tax,
      shipping,
      quantity: line.quantity,
      weightGrams: line.weightGrams,
      lineSubtotal: line.lineSubtotal,
      lineTotal,
      warehouseId: line.warehouseId ?? null,
      reservationId: line.reservationId ?? null,
    };
  });
}

/**
 * Consumes a verified PaymentSucceeded event and creates the Order.
 * Idempotent — safe to invoke more than once for the same paymentId
 * (duplicate deliveries, restarts, catch-up scans all no-op past this point).
 */
export async function handlePaymentSucceededEvent(payload: Record<string, unknown>): Promise<void> {
  const paymentId = String(payload.paymentId ?? '');
  if (!paymentId) {
    logger.error({ payload }, 'PaymentSucceeded event missing paymentId — cannot create order');
    return;
  }

  try {
    const alreadyExists = await OrderModel.exists({ paymentId });
    if (alreadyExists) {
      logger.info({ paymentId }, 'Order already exists for this payment — skipping (idempotent)');
      return;
    }

    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      logger.error({ paymentId }, 'Payment not found — cannot create order');
      return;
    }

    const checkout = await CheckoutSessionModel.findById(payment.checkoutId);
    if (!checkout) {
      logger.error(
        { paymentId, checkoutId: payment.checkoutId },
        'Checkout session not found — cannot create order',
      );
      return;
    }

    if (!checkout.lines.length) {
      logger.error({ paymentId }, 'Checkout has no line items — cannot create order');
      return;
    }

    // Validate + commit reservations: convert the checkout's held stock into a permanent sale.
    const committedReservationIds: Types.ObjectId[] = [];
    for (const line of checkout.lines) {
      if (!line.reservationId) {
        logger.warn(
          { paymentId, variantId: line.variantId.toString() },
          'Checkout line has no reservation — committing without one',
        );
        continue;
      }
      try {
        await reservationService.commit(
          line.reservationId.toString(),
          SYSTEM_ACTOR,
          `Order fulfilment for payment ${payment.referenceNumber}`,
        );
        committedReservationIds.push(line.reservationId);
      } catch (error) {
        // Already committed/released — don't block order creation on a stock ledger race.
        logger.warn(
          { err: error, reservationId: line.reservationId.toString() },
          'Failed to commit reservation during order creation — continuing',
        );
      }
    }

    const items = await buildOrderItems(checkout);

    let order;
    try {
      order = await OrderModel.create({
        orderNumber: newOrderNumber(),
        paymentId: payment._id,
        checkoutId: checkout._id,
        checkoutToken: checkout.checkoutToken,
        customerId: checkout.customerId,
        userId: checkout.userId ?? null,
        status: ORDER_STATUS.PENDING,
        items,
        shippingAddress: checkout.shippingAddress,
        billingAddress: checkout.billingAddress,
        shippingMethod: checkout.shippingMethod,
        deliveryMethod: checkout.deliveryMethod,
        currency: checkout.currency,
        totals: checkout.totals,
        paymentMethod: payment.method,
        paymentReference: payment.referenceNumber,
        paidAt: payment.paidAt ?? new Date(),
        reservationIds: committedReservationIds,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        logger.warn({ paymentId }, 'Order creation race — another process already created it');
        return;
      }
      throw error;
    }

    await writeAuditLog({
      action: ORDER_AUDIT.ORDER_CREATED,
      resourceType: 'orders',
      resourceId: order._id.toString(),
      after: toPlain(order),
      metadata: { paymentId },
    });

    await recordOrderTimeline({
      orderId: order._id.toString(),
      event: 'created',
      status: ORDER_STATUS.PENDING,
      note: 'Order created from a verified payment',
    });

    await invoiceService.generate(order);

    await publishOrderEvent(
      ORDER_EVENT_TYPE.ORDER_CREATED,
      {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        paymentId: payment._id.toString(),
        customerId: order.customerId.toString(),
        grandTotal: order.totals.grandTotal,
        currency: order.currency,
      },
      { orderId: order._id.toString(), paymentId: payment._id.toString() },
    );

    logger.info({ orderId: order._id.toString(), orderNumber: order.orderNumber }, 'Order created');
  } catch (error) {
    logger.error({ err: error, paymentId }, 'Failed to process PaymentSucceeded event');
  }
}

/** Registers the real-time, in-process subscription. Call once at bootstrap. */
export function initOrderPaymentConsumer(): void {
  domainEventBus.on(PAYMENT_SUCCEEDED, (payload: Record<string, unknown>) => {
    void handlePaymentSucceededEvent(payload);
  });
}

/**
 * Catch-up scan for PaymentSucceeded events published while this process
 * wasn't running (or wasn't yet subscribed) — keeps order creation durable
 * without needing a full message broker.
 */
export async function catchUpUnconsumedPaymentEvents(): Promise<{
  scanned: number;
  created: number;
}> {
  const events = await PaymentEventModel.find({ type: PAYMENT_SUCCEEDED })
    .sort({ publishedAt: 1 })
    .limit(500);

  let created = 0;
  for (const event of events) {
    const paymentId = event.payload?.paymentId as string | undefined;
    if (!paymentId) continue;
    const exists = await OrderModel.exists({ paymentId });
    if (exists) continue;
    await handlePaymentSucceededEvent(event.payload as Record<string, unknown>);
    created += 1;
  }

  return { scanned: events.length, created };
}
