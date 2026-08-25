import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { OrderModel, type OrderItemSubdocument } from '@/models/order.models.js';
import {
  PaymentModel,
  PaymentEventModel,
  PaymentAttemptModel,
  PaymentWebhookModel,
} from '@/models/payment.models.js';
import { CheckoutSessionModel, type CheckoutSessionDocument } from '@/models/checkout.models.js';
import { CustomerModel } from '@/models/customer.models.js';
import { ProductModel, ProductVariantModel, ProductMediaModel } from '@/models/product.models.js';
import { reservationService } from '@/services/reservation.service.js';
import { invoiceService } from '@/services/invoice.service.js';
import { recordOrderTimeline } from '@/services/order-timeline.service.js';
import { publishOrderEvent } from '@/services/order-event-publisher.js';
import { writeAuditLog } from '@/services/audit.service.js';
import { domainEventBus } from '@/services/events/event-bus.js';
import { cartService } from '@/services/cart.service.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import { logger } from '@/config/logger.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import { ORDER_AUDIT, ORDER_EVENT_TYPE, CONSUMED_PAYMENT_EVENT_TYPES } from '@/constants/order.js';
import { CHECKOUT_AUDIT, CHECKOUT_STATUS } from '@/constants/checkout.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status.js';
import { PAYMENT_EVENT_TYPE } from '@/constants/payment.js';
import { publishPaymentEvent } from '@/services/payment-event-publisher.js';
import type { PaymentDocument } from '@/models/payment.models.js';
import { paymentReceivedAt } from '@/utils/order-received-at.js';
import { liveOrderExistsForCheckout, liveOrderExistsForPayment } from '@/utils/live-order.js';
import {
  KOKO_RECOVER_LOOKBACK_MS,
  kokoReferenceIsConfirmedCapture,
  kokoSuccessFallbackAllowed,
  UNVERIFIED_KOKO_ORDER_NUMBERS,
} from '@/utils/koko-auto-recover.js';
import { parseWebhookPayload } from '@/services/gateways/gateway.utils.js';
import {
  ensureMetaPurchaseTracked,
  trackMetaPurchaseForOrder,
} from '@/services/analytics/purchase-tracking.service.js';

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
  const productIds = [...new Set(checkout.lines.map((l) => l.productId.toString()))];
  const [variants, products, productMedia] = await Promise.all([
    ProductVariantModel.find({ _id: { $in: variantIds } }),
    ProductModel.find({ _id: { $in: productIds } }),
    ProductMediaModel.find({ productId: { $in: productIds }, isDeleted: false }).sort({
      priority: 1,
    }),
  ]);

  const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const mediaByProductId = new Map<string, string[]>();
  for (const media of productMedia) {
    const key = media.productId.toString();
    const urls = mediaByProductId.get(key) ?? [];
    if (media.url) urls.push(String(media.url));
    mediaByProductId.set(key, urls);
  }

  const primaryImageIds = variants
    .map((v) => v.primaryImageId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const primaryMedia = primaryImageIds.length
    ? await ProductMediaModel.find({ _id: { $in: primaryImageIds } })
    : [];
  const mediaMap = new Map(
    primaryMedia.map((m) => [m._id.toString(), m as unknown as { url: string }]),
  );

  const subtotal = checkout.totals.subtotal || 1;

  return checkout.lines.map((line) => {
    const variant = variantMap.get(line.variantId.toString());
    const product = productMap.get(line.productId.toString());
    const primaryImage = variant?.primaryImageId
      ? mediaMap.get(variant.primaryImageId.toString())?.url
      : undefined;
    const productImages = mediaByProductId.get(line.productId.toString()) ?? [];
    const images = [primaryImage, variant?.thumbnailUrl ?? undefined, ...productImages].filter(
      (u): u is string => Boolean(u),
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
    const alreadyExists = await liveOrderExistsForPayment(paymentId);
    if (alreadyExists) {
      logger.info({ paymentId }, 'Order already exists for this payment — skipping (idempotent)');
      await ensureMetaPurchaseTracked(paymentId);
      return;
    }

    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      logger.error({ paymentId }, 'Payment not found — cannot create order');
      return;
    }

    if (await liveOrderExistsForCheckout(payment.checkoutId)) {
      logger.info(
        { paymentId, checkoutId: payment.checkoutId.toString() },
        'Live order already exists for this checkout — skipping duplicate',
      );
      return;
    }

    if (
      payment.method !== PAYMENT_METHOD.COD &&
      payment.status !== PAYMENT_STATUS.PAID &&
      payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED &&
      payment.status !== PAYMENT_STATUS.REFUNDED
    ) {
      logger.warn(
        { paymentId, status: payment.status, method: payment.method },
        'Skip order create — gateway payment is not paid',
      );
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

    // Stock is deducted only after payment is verified: reserve then commit atomically.
    // Older flows may already have an active reservationId on the line — commit that.
    const committedReservationIds: Types.ObjectId[] = [];
    let stockWarning: string | null = null;
    for (const line of checkout.lines) {
      try {
        let reservationId = line.reservationId?.toString() ?? null;
        if (!reservationId) {
          if (!line.warehouseId) {
            throw new Error(`No warehouse for ${line.sku} — cannot deduct stock`);
          }
          const reservation = await reservationService.reserve(
            {
              warehouseId: line.warehouseId.toString(),
              variantId: line.variantId.toString(),
              quantity: line.quantity,
              reason: 'order_fulfilment',
              referenceType: 'payment',
              referenceId: payment._id.toString(),
              timeoutMinutes: 15,
            },
            SYSTEM_ACTOR,
          );
          reservationId = reservation._id.toString();
          line.reservationId = reservation._id;
        }
        await reservationService.commit(
          reservationId,
          SYSTEM_ACTOR,
          `Order fulfilment for payment ${payment.referenceNumber}`,
        );
        committedReservationIds.push(new Types.ObjectId(reservationId));
      } catch (error) {
        stockWarning =
          'One or more items could not be deducted from stock. Review inventory before packing.';
        logger.error(
          { err: error, variantId: line.variantId.toString(), paymentId },
          'Failed to deduct stock during order creation — creating paid order anyway',
        );
      }
    }

    const items = await buildOrderItems(checkout);
    const receivedAt = paymentReceivedAt(payment) ?? new Date();

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
        paidAt: receivedAt,
        placedAt: receivedAt,
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

    try {
      await CustomerModel.updateOne(
        { _id: checkout.customerId, isDeleted: false },
        {
          $inc: {
            orderCount: 1,
            lifetimeValue: Number(checkout.totals.grandTotal ?? 0),
          },
        },
      );
    } catch (error) {
      logger.warn(
        { err: error, customerId: checkout.customerId.toString(), orderId: order._id.toString() },
        'Failed to increment customer orderCount after order creation — continuing',
      );
    }

    await recordOrderTimeline({
      orderId: order._id.toString(),
      event: 'created',
      status: ORDER_STATUS.PENDING,
      note: stockWarning
        ? `Order created from a verified payment. ${stockWarning}`
        : 'Order created from a verified payment',
    });

    try {
      checkout.status = CHECKOUT_STATUS.COMPLETED;
      checkout.reservationExpiresAt = null;
      await checkout.save();
      await writeAuditLog({
        action: CHECKOUT_AUDIT.COMPLETED,
        resourceType: 'checkout_sessions',
        resourceId: checkout._id.toString(),
        metadata: { orderId: order._id.toString(), paymentId },
      });
    } catch (error) {
      logger.warn(
        { err: error, checkoutId: checkout._id.toString(), orderId: order._id.toString() },
        'Failed to mark checkout completed after order creation — continuing',
      );
    }

    try {
      await cartService.clear({ customerId: checkout.customerId.toString() }, SYSTEM_ACTOR);
    } catch (error) {
      logger.warn(
        { err: error, customerId: checkout.customerId.toString(), orderId: order._id.toString() },
        'Failed to clear cart after order creation — continuing',
      );
    }

    try {
      await invoiceService.generate(order);
    } catch (error) {
      logger.warn(
        { err: error, orderId: order._id.toString(), paymentId },
        'Failed to generate invoice after order creation — continuing',
      );
    }

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

    try {
      await trackMetaPurchaseForOrder(payment, order, checkout);
    } catch (error) {
      logger.warn(
        { err: error, orderNumber: order.orderNumber, paymentId },
        'Meta Purchase after order create failed — order is still valid',
      );
    }

    logger.info({ orderId: order._id.toString(), orderNumber: order.orderNumber }, 'Order created');
  } catch (error) {
    logger.error({ err: error, paymentId }, 'Failed to process PaymentSucceeded event');
  }
}

/**
 * COD has no online gateway step — create the order as soon as payment is placed.
 * Safe to call multiple times (idempotent).
 */
export async function fulfillCodPaymentIfNeeded(payment: PaymentDocument): Promise<void> {
  if (payment.method !== PAYMENT_METHOD.COD) return;

  const paymentId = payment._id.toString();
  const alreadyExists = await liveOrderExistsForPayment(paymentId);
  if (alreadyExists) {
    await ensureMetaPurchaseTracked(paymentId);
    return;
  }

  const succeededPayload = {
    paymentId,
    checkoutToken: payment.checkoutToken,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
  };

  await publishPaymentEvent(PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED, succeededPayload, {
    paymentId,
    checkoutId: payment.checkoutId.toString(),
  });
  await handlePaymentSucceededEvent(succeededPayload);
}

/** Backfill orders for COD payments that were created before fulfillment ran. */
export async function catchUpOrphanCodPayments(): Promise<{ scanned: number; fulfilled: number }> {
  const payments = await PaymentModel.find({
    method: PAYMENT_METHOD.COD,
    isDeleted: false,
  }).limit(200);

  let fulfilled = 0;
  for (const payment of payments) {
    const exists = await OrderModel.exists({ paymentId: payment._id });
    if (exists) continue;
    await fulfillCodPaymentIfNeeded(payment);
    fulfilled += 1;
  }

  return { scanned: payments.length, fulfilled };
}

/**
 * Payment failed/cancelled/expired — release any payment-window inventory hold
 * so available stock is restored immediately.
 */
export async function handlePaymentFailedEvent(
  payload: Record<string, unknown>,
  refs?: Record<string, unknown>,
): Promise<void> {
  const paymentId = String(payload.paymentId ?? refs?.paymentId ?? '');
  const checkoutIdFromPayload = String(payload.checkoutId ?? refs?.checkoutId ?? '');
  try {
    let checkoutId = checkoutIdFromPayload;
    if (!checkoutId && paymentId) {
      const payment = await PaymentModel.findById(paymentId).select('checkoutId').lean();
      checkoutId = payment?.checkoutId?.toString() ?? '';
    }
    if (!checkoutId) {
      logger.warn(
        { payload, refs },
        'PaymentFailed event missing checkoutId — cannot release stock',
      );
      return;
    }

    const { checkoutService } = await import('@/services/checkout.service.js');
    await checkoutService.releaseForPaymentFailure(
      checkoutId,
      `Payment failed (${String(payload.status ?? 'failed')}) — release hold`,
    );
    logger.info({ checkoutId, paymentId }, 'Released checkout reservations after payment failure');
  } catch (error) {
    logger.error({ err: error, paymentId, payload }, 'Failed to release stock on PaymentFailed');
  }
}

/** Registers the real-time, in-process subscription. Call once at bootstrap. */
export function initOrderPaymentConsumer(): void {
  domainEventBus.on(PAYMENT_SUCCEEDED, (payload: Record<string, unknown>) => {
    void handlePaymentSucceededEvent(payload);
  });
  domainEventBus.on(
    PAYMENT_EVENT_TYPE.PAYMENT_FAILED,
    (payload: Record<string, unknown>, refs?: Record<string, unknown>) => {
      void handlePaymentFailedEvent(payload, refs);
    },
  );
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
    if (exists) {
      const existingOrder = await OrderModel.findOne({ paymentId }).select('createdAt').lean();
      const createdAt = existingOrder?.createdAt ? new Date(existingOrder.createdAt).getTime() : 0;
      if (createdAt && Date.now() - createdAt < 6 * 60 * 60 * 1000) {
        await ensureMetaPurchaseTracked(paymentId);
      }
      continue;
    }
    await handlePaymentSucceededEvent(event.payload as Record<string, unknown>);
    const nowExists = await OrderModel.exists({ paymentId });
    if (nowExists) created += 1;
  }

  return { scanned: events.length, created };
}

/**
 * Paid gateway payments that never produced an order (webhook race, restart, Mintpay return).
 */
export async function catchUpOrphanPaidGatewayPayments(): Promise<{
  scanned: number;
  created: number;
}> {
  const payments = await PaymentModel.find({
    method: { $in: [PAYMENT_METHOD.MINTPAY, PAYMENT_METHOD.PAYHERE, PAYMENT_METHOD.KOKO] },
    status: PAYMENT_STATUS.PAID,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(200);

  let created = 0;
  for (const payment of payments) {
    if (payment.metadata?.kokoAutoRecovered || payment.metadata?.kokoAutoRecoveryReversed) {
      continue;
    }
    const exists = await liveOrderExistsForPayment(payment._id);
    if (exists) continue;
    if (await liveOrderExistsForCheckout(payment.checkoutId)) continue;
    await handlePaymentSucceededEvent({
      paymentId: payment._id.toString(),
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });
    const nowExists = await liveOrderExistsForPayment(payment._id);
    if (nowExists) created += 1;
  }

  return { scanned: payments.length, created };
}

/** Confirmed Mintpay merchant-portal purchases that never reached our order table. */
const CONFIRMED_MINTPAY_PURCHASE_IDS = ['2975188', '2983159'] as const;
const CONFIRMED_MINTPAY_REF_PREFIXES = [
  'PAY-MS0OUJZP',
  'PAY-MSOOUJZP',
  'PAY-MSOOUIZP',
  'PAY-MSRU476F',
] as const;

export async function recoverConfirmedMintpayOrders(): Promise<{
  scanned: number;
  recovered: Array<{
    referenceNumber: string;
    orderNumber: string | null;
    items: string[];
    amount: number;
  }>;
}> {
  const prefixRegex = new RegExp(`^(${CONFIRMED_MINTPAY_REF_PREFIXES.join('|')})`);
  const attempts = await PaymentAttemptModel.find({
    gateway: PAYMENT_METHOD.MINTPAY,
    gatewayPaymentId: { $in: [...CONFIRMED_MINTPAY_PURCHASE_IDS] },
  }).select('paymentId');
  const attemptPaymentIds = attempts.map((a) => a.paymentId);

  const payments = await PaymentModel.find({
    method: PAYMENT_METHOD.MINTPAY,
    isDeleted: false,
    $or: [
      { _id: { $in: attemptPaymentIds } },
      { gatewayPaymentId: { $in: [...CONFIRMED_MINTPAY_PURCHASE_IDS] } },
      { 'metadata.mintpayPurchaseId': { $in: [...CONFIRMED_MINTPAY_PURCHASE_IDS] } },
      { referenceNumber: prefixRegex },
    ],
  }).sort({ createdAt: -1 });

  const recovered: Array<{
    referenceNumber: string;
    orderNumber: string | null;
    items: string[];
    amount: number;
  }> = [];

  for (const payment of payments) {
    if (await liveOrderExistsForPayment(payment._id)) continue;
    if (await liveOrderExistsForCheckout(payment.checkoutId)) continue;
    const receivedAt = paymentReceivedAt(payment) ?? payment.createdAt ?? new Date();
    if (payment.status !== PAYMENT_STATUS.PAID) {
      payment.status = PAYMENT_STATUS.PAID;
      payment.paidAt = receivedAt;
      payment.failureReason = null;
      await payment.save();
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED,
        {
          paymentId: payment._id.toString(),
          checkoutToken: payment.checkoutToken,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
        },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );
    } else if (!payment.paidAt || payment.paidAt.getTime() - receivedAt.getTime() > 60_000) {
      payment.paidAt = receivedAt;
      await payment.save();
    }

    await handlePaymentSucceededEvent({
      paymentId: payment._id.toString(),
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });

    const order = await OrderModel.findOne({ paymentId: payment._id });
    if (order) {
      const current = order.paidAt ?? order.placedAt ?? order.createdAt;
      if (!current || current.getTime() - receivedAt.getTime() > 60_000) {
        order.paidAt = receivedAt;
        order.placedAt = receivedAt;
        await order.save();
      }
    }
    recovered.push({
      referenceNumber: payment.referenceNumber,
      orderNumber: order?.orderNumber ?? null,
      items: (order?.items ?? []).map((item) => `${item.name} × ${item.quantity}`),
      amount: payment.amount,
    });
  }

  return { scanned: payments.length, recovered };
}

/**
 * Create an admin order only when Koko (or our already-paid row) confirms capture.
 * Never invent a paid order from a stuck/processing checkout — that put unpaid
 * Dilanka attempts into FE Admin after Koko declined them for insufficient funds.
 */
export async function recoverConfirmedKokoOrders(): Promise<{
  scanned: number;
  recovered: Array<{
    referenceNumber: string;
    orderNumber: string | null;
    items: string[];
    amount: number;
  }>;
  scannedReferences: string[];
}> {
  const since = new Date(Date.now() - KOKO_RECOVER_LOOKBACK_MS);
  const recentAttempts = await PaymentAttemptModel.find({
    gateway: PAYMENT_METHOD.KOKO,
    createdAt: { $gte: since },
  })
    .select('paymentId')
    .lean();
  const payments = await PaymentModel.find({
    method: PAYMENT_METHOD.KOKO,
    isDeleted: false,
    $or: [
      { createdAt: { $gte: since } },
      { _id: { $in: recentAttempts.map((row) => row.paymentId) } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(200);

  const { kokoGateway } = await import('@/services/gateways/koko.gateway.js');
  const recovered: Array<{
    referenceNumber: string;
    orderNumber: string | null;
    items: string[];
    amount: number;
  }> = [];

  for (const payment of payments) {
    if (await liveOrderExistsForPayment(payment._id)) continue;
    if (await liveOrderExistsForCheckout(payment.checkoutId)) continue;
    if (payment.metadata?.kokoAutoRecoveryReversed) continue;

    if (payment.status !== PAYMENT_STATUS.PAID) {
      const attempt = await PaymentAttemptModel.findOne({ paymentId: payment._id }).sort({
        attemptNumber: -1,
      });
      const requestOrderId =
        attempt?.requestPayload && typeof attempt.requestPayload.orderId === 'string'
          ? attempt.requestPayload.orderId
          : '';
      const orderId =
        requestOrderId || `${payment.referenceNumber}-A${Math.max(1, payment.attemptCount || 1)}`;
      const viewed = await kokoGateway.verifyTransaction(orderId);
      const viewedPaid = viewed?.status === PAYMENT_STATUS.PAID;
      const merchantCaptured = kokoReferenceIsConfirmedCapture(payment.referenceNumber);
      let storedTxnId: string | undefined;
      let storedPaid = false;
      if (!viewedPaid && !merchantCaptured) {
        const escapedOrderId = orderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stored = await PaymentWebhookModel.find({
          gateway: PAYMENT_METHOD.KOKO,
          createdAt: { $gte: since },
          rawPayload: new RegExp(escapedOrderId),
        })
          .sort({ createdAt: -1 })
          .limit(3);
        for (const row of stored) {
          if (!row.rawPayload) continue;
          const verified = await kokoGateway.verifyWebhook({
            headers: {},
            rawBody: row.rawPayload,
          });
          if (verified.valid && verified.status === PAYMENT_STATUS.PAID) {
            storedPaid = true;
            storedTxnId = verified.gatewayTxnId;
            break;
          }
          const payload = parseWebhookPayload(row.rawPayload);
          const claimedTrnId = String(
            payload.trnId ?? payload.trn_id ?? payload.transactionId ?? '',
          );
          const claimedStatus = String(payload.status ?? payload.paymentStatus ?? '');
          const claimedSignature = String(payload.signature ?? '');
          if (
            kokoSuccessFallbackAllowed({
              status: claimedStatus,
              trnId: claimedTrnId,
              signature: claimedSignature,
              paymentStatus: payment.status,
            })
          ) {
            storedPaid = true;
            storedTxnId = claimedTrnId;
            break;
          }
        }
      }
      if (!viewedPaid && !merchantCaptured && !storedPaid) continue;

      const gatewayTxnId = viewed?.gatewayTxnId || storedTxnId;
      payment.status = PAYMENT_STATUS.PAID;
      payment.paidAt = payment.paidAt ?? new Date();
      payment.failureReason = null;
      payment.metadata = {
        ...payment.metadata,
        kokoReconciled: true,
        kokoAutoRecovered: false,
        ...(merchantCaptured && !viewedPaid && !storedPaid ? { kokoMerchantConfirmed: true } : {}),
        ...(storedPaid ? { kokoWebhookConfirmed: true } : {}),
        ...(gatewayTxnId ? { gatewayTxnId } : {}),
      };
      await payment.save();
      if (attempt) {
        attempt.status = 'succeeded';
        if (gatewayTxnId) attempt.gatewayPaymentId = gatewayTxnId;
        await attempt.save();
      }
      logger.info(
        {
          referenceNumber: payment.referenceNumber,
          viewedPaid,
          merchantCaptured,
          storedPaid,
        },
        'Koko recovery: captured payment confirmed — creating admin order',
      );
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED,
        {
          paymentId: payment._id.toString(),
          checkoutToken: payment.checkoutToken,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          gatewayTxnId,
        },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );
    }

    if (payment.metadata?.kokoAutoRecovered) continue;

    await handlePaymentSucceededEvent({
      paymentId: payment._id.toString(),
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });

    const order = await OrderModel.findOne({
      paymentId: payment._id,
      status: { $ne: ORDER_STATUS.CANCELLED },
    });
    if (!order) continue;
    recovered.push({
      referenceNumber: payment.referenceNumber,
      orderNumber: order.orderNumber ?? null,
      items: (order.items ?? []).map((item) => `${item.name} × ${item.quantity}`),
      amount: payment.amount,
    });
  }

  return {
    scanned: payments.length,
    recovered,
    scannedReferences: payments.map((payment) => `${payment.referenceNumber}:${payment.status}`),
  };
}

/**
 * Remove admin orders that were created by guessing a stuck Koko checkout was paid.
 * Koko Success-tab captures are kept; insufficient-funds / declined attempts are not.
 */
export async function voidUnverifiedKokoAutoOrders(): Promise<{
  scanned: number;
  voided: Array<{ orderNumber: string; referenceNumber: string }>;
}> {
  const { orderService } = await import('@/services/order.service.js');
  const autoPayments = await PaymentModel.find({
    method: PAYMENT_METHOD.KOKO,
    isDeleted: false,
    'metadata.kokoAutoRecovered': true,
  }).limit(200);

  const orders = await OrderModel.find({
    isDeleted: false,
    status: { $ne: ORDER_STATUS.CANCELLED },
    $or: [
      { paymentId: { $in: autoPayments.map((row) => row._id) } },
      { orderNumber: { $in: [...UNVERIFIED_KOKO_ORDER_NUMBERS] } },
    ],
  });

  const { kokoGateway } = await import('@/services/gateways/koko.gateway.js');
  const voided: Array<{ orderNumber: string; referenceNumber: string }> = [];

  for (const order of orders) {
    const payment = await PaymentModel.findById(order.paymentId);
    const returnConfirmed = Boolean(payment?.metadata?.kokoReturnOrderId);
    let viewedPaid = false;
    if (payment && !returnConfirmed) {
      const attempt = await PaymentAttemptModel.findOne({ paymentId: payment._id }).sort({
        attemptNumber: -1,
      });
      const requestOrderId =
        attempt?.requestPayload && typeof attempt.requestPayload.orderId === 'string'
          ? attempt.requestPayload.orderId
          : '';
      const orderId =
        requestOrderId || `${payment.referenceNumber}-A${Math.max(1, payment.attemptCount || 1)}`;
      const viewed = await kokoGateway.verifyTransaction(orderId);
      viewedPaid = viewed?.status === PAYMENT_STATUS.PAID;
    }
    if (
      returnConfirmed ||
      viewedPaid ||
      (payment && kokoReferenceIsConfirmedCapture(payment.referenceNumber))
    ) {
      continue;
    }

    await orderService.cancelAsSystem(
      order._id.toString(),
      'Cancelled — payment was not captured by Koko (insufficient funds / declined / abandoned checkout)',
    );
    if (payment && payment.status === PAYMENT_STATUS.PAID) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failedAt = payment.failedAt ?? new Date();
      payment.paidAt = null;
      payment.failureReason =
        'Reversed unverified Koko auto-recovery — gateway did not capture funds';
      payment.metadata = {
        ...payment.metadata,
        kokoAutoRecovered: false,
        kokoAutoRecoveryReversed: true,
      };
      await payment.save();
    }
    voided.push({
      orderNumber: order.orderNumber,
      referenceNumber: payment?.referenceNumber ?? '',
    });
    logger.warn(
      { orderNumber: order.orderNumber, referenceNumber: payment?.referenceNumber },
      'Voided admin order created without a captured Koko payment',
    );
  }

  for (const payment of autoPayments) {
    if (payment.metadata?.kokoReturnOrderId) continue;
    if (kokoReferenceIsConfirmedCapture(payment.referenceNumber)) continue;
    if (payment.status !== PAYMENT_STATUS.PAID) continue;
    const liveOrder = await OrderModel.exists({
      paymentId: payment._id,
      status: { $ne: ORDER_STATUS.CANCELLED },
    });
    if (liveOrder) continue;
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failedAt = payment.failedAt ?? new Date();
    payment.paidAt = null;
    payment.failureReason =
      'Reversed unverified Koko auto-recovery — gateway did not capture funds';
    payment.metadata = {
      ...payment.metadata,
      kokoAutoRecovered: false,
      kokoAutoRecoveryReversed: true,
    };
    await payment.save();
  }

  return { scanned: orders.length, voided };
}
