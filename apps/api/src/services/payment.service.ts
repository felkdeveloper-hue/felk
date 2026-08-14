import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import {
  PaymentModel,
  PaymentAttemptModel,
  PaymentTransactionModel,
  PaymentWebhookModel,
  type PaymentDocument,
} from '@/models/payment.models.js';
import { CheckoutSessionModel } from '@/models/checkout.models.js';
import { OrderModel } from '@/models/order.models.js';
import { checkoutService } from '@/services/checkout.service.js';
import { customerService } from '@/services/customer.service.js';
import { getGateway, isKnownGateway } from '@/services/gateways/registry.js';
import { publishPaymentEvent } from '@/services/payment-event-publisher.js';
import { writePaymentLog } from '@/services/payment-log.service.js';
import { writeAuditLog } from '@/services/audit.service.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination.js';
import {
  PAYMENT_STATUS,
  PAYMENT_TERMINAL_SUCCESS_STATUSES,
  PAYMENT_METHOD,
  type PaymentMethod,
} from '@/constants/payment-status.js';
import {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_AUDIT,
  PAYMENT_EVENT_TYPE,
  PAYMENT_MAX_RETRY_ATTEMPTS,
} from '@/constants/payment.js';
import {
  getHeader,
  parseWebhookPayload,
  rawBodyToString,
  toPublicStorefrontUrl,
} from '@/services/gateways/gateway.utils.js';
import type { AuthenticatedUser } from '@/types/index.js';
import { analyticsService } from '@/services/analytics/analytics.service.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { paymentSuccessfulEmail, paymentFailedEmail } from '@/emails/index.js';
import {
  fulfillCodPaymentIfNeeded,
  handlePaymentSucceededEvent,
} from '@/services/order-payment-consumer.service.js';
import {
  decodeMintpayBrowserHash,
  mintpayFailHashMessage,
  mintpaySuccessHashMessage,
} from '@/services/gateways/mintpay.gateway.js';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function newReferenceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  return `PAY-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function toAttemptOrderId(referenceNumber: string, attemptNumber: number) {
  return `${referenceNumber}-A${attemptNumber}`;
}

const NON_TERMINAL_STATUSES = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PROCESSING,
  PAYMENT_STATUS.AUTHORIZED,
];

const RETRYABLE_STATUSES = [
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED,
];

export class PaymentService {
  /* ------------------------------------------------------------------ */
  /* Ownership / permission helpers                                     */
  /* ------------------------------------------------------------------ */

  private async assertOwnerOrFinance(payment: PaymentDocument, user: AuthenticatedUser) {
    const customer = await customerService.ensureForUser(user);
    const isOwner = payment.customerId.toString() === customer._id.toString();
    const isPrivileged = user.permissions.some(
      (p) => p === 'payments.view' || p === 'payments.manage' || p === 'payments.read',
    );
    if (!isOwner && !isPrivileged) {
      throw ApiError.forbidden('You can only access your own payments');
    }
    return { customer, isOwner, isPrivileged };
  }

  /* ------------------------------------------------------------------ */
  /* Create / Retry — both funnel through createAttempt()               */
  /* ------------------------------------------------------------------ */

  async createPayment(
    user: AuthenticatedUser,
    payload: { checkoutRef: string; method: PaymentMethod; returnUrl?: string; cancelUrl?: string },
    actor: ActorMeta,
  ) {
    if (payload.method === PAYMENT_METHOD.COD) {
      throw ApiError.badRequest(
        'Cash on delivery is not available. Please pay online to complete your order.',
        { method: payload.method },
        'COD_DISABLED',
      );
    }

    const customer = await customerService.ensureForUser(user, actor);
    const checkout = await checkoutService.ensurePayableForPayment(payload.checkoutRef, user);

    if (!checkout.shippingAddress || !checkout.lines?.length) {
      throw ApiError.badRequest(
        'Checkout is missing a shipping address or line items',
        { checkoutId: checkout._id.toString() },
        'CHECKOUT_NOT_READY',
      );
    }

    // Never hold inventory for unpaid gateway redirects. Stock is reserved+committed
    // only after the gateway confirms payment (order creation). Release any leftover
    // hold from older Place Order builds so Available/OOS recover immediately.
    if (checkout.reservationIds?.length) {
      await checkoutService.releaseForPaymentFailure(
        checkout._id.toString(),
        'Clear unpaid stock hold before gateway redirect',
      );
    }
    const liveCheckout = await checkoutService.getByIdOrToken(checkout._id.toString());

    let payment = await PaymentModel.findOne({
      checkoutId: checkout._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (payment) {
      if (PAYMENT_TERMINAL_SUCCESS_STATUSES.includes(payment.status as never)) {
        return this.toSummary(payment, { includeRedirect: false });
      }
      if (
        NON_TERMINAL_STATUSES.includes(payment.status as never) &&
        payment.expiresAt > new Date()
      ) {
        const methodChanged = payment.method !== payload.method;

        if (methodChanged) {
          // Customer switched gateway on the checkout UI — do not reuse the old redirect.
          payment.method = payload.method;
          if (payload.returnUrl) payment.returnUrl = payload.returnUrl;
          if (payload.cancelUrl) payment.cancelUrl = payload.cancelUrl;
          payment.redirectUrl = null;
          if (payment.metadata?.redirectForm) {
            const { redirectForm: _removed, ...rest } = payment.metadata;
            payment.metadata = rest;
          }
          payment.amount = liveCheckout.totals.grandTotal;
          await payment.save();
          return this.createAttempt(payment, customer, actor);
        }

        if (payment.attemptCount === 0) {
          // Payment doc exists but its first attempt never completed (e.g. crash
          // between create() and createAttempt()) — finish creating it now.
          if (payload.returnUrl) payment.returnUrl = payload.returnUrl;
          if (payload.cancelUrl) payment.cancelUrl = payload.cancelUrl;
          payment.amount = liveCheckout.totals.grandTotal;
          await payment.save();
          return this.createAttempt(payment, customer, actor);
        }

        // Stale PayHere form after PAYHERE_MODE switch (sandbox <-> live) must be rebuilt.
        const redirectForm = payment.metadata?.redirectForm as
          { action?: unknown } | null | undefined;
        const storedAction = typeof redirectForm?.action === 'string' ? redirectForm.action : '';
        const expectedHost =
          appConfig.payment.payhere.mode === 'live' ? 'www.payhere.lk' : 'sandbox.payhere.lk';
        if (
          payment.method === PAYMENT_METHOD.PAYHERE &&
          storedAction &&
          !storedAction.includes(expectedHost)
        ) {
          payment.redirectUrl = null;
          const { redirectForm: _removed, ...rest } = payment.metadata ?? {};
          payment.metadata = rest;
          await payment.save();
          return this.createAttempt(payment, customer, actor);
        }

        // Mintpay needs a POST form with purchase_id — rebuild if missing.
        if (payment.method === PAYMENT_METHOD.MINTPAY && !payment.metadata?.redirectForm) {
          return this.createAttempt(payment, customer, actor);
        }

        // Idempotent — same in-flight payment. For COD, still ensure order exists.
        await fulfillCodPaymentIfNeeded(payment);
        return {
          ...this.toSummary(payment, { includeRedirect: true }),
          redirectForm: payment.metadata?.redirectForm,
        };
      }

      // Timed-out pending/processing OR failed/cancelled/expired → seamless retry.
      // Shoppers should not see "use /payments/retry" after backing out of Mintpay/PayHere.
      const isExpiredNonTerminal =
        NON_TERMINAL_STATUSES.includes(payment.status as never) && payment.expiresAt <= new Date();
      const isRetryable = RETRYABLE_STATUSES.includes(payment.status as never);
      if (isRetryable || isExpiredNonTerminal) {
        if (payload.returnUrl) payment.returnUrl = payload.returnUrl;
        if (payload.cancelUrl) payment.cancelUrl = payload.cancelUrl;
        // Mark timed-out attempts as expired so retryPayment accepts them.
        if (isExpiredNonTerminal) {
          payment.status = PAYMENT_STATUS.EXPIRED;
          payment.failureReason = payment.failureReason ?? 'Payment attempt expired';
        }
        await payment.save();
        return this.retryPayment(
          user,
          { paymentRef: payment._id.toString(), method: payload.method },
          actor,
        );
      }

      throw ApiError.conflict(
        'A payment is already in progress for this checkout',
        { paymentId: payment._id.toString(), status: payment.status },
        'PAYMENT_IN_PROGRESS',
      );
    }

    payment = await PaymentModel.create({
      referenceNumber: newReferenceNumber(),
      checkoutId: liveCheckout._id,
      checkoutToken: liveCheckout.checkoutToken,
      customerId: customer._id,
      userId: user.id,
      method: payload.method,
      status: PAYMENT_STATUS.PENDING,
      amount: liveCheckout.totals.grandTotal,
      currency: liveCheckout.currency,
      returnUrl:
        payload.returnUrl ??
        `${appConfig.payment.returnUrl}?checkoutToken=${liveCheckout.checkoutToken}`,
      cancelUrl:
        payload.cancelUrl ??
        `${appConfig.payment.cancelUrl}?checkoutToken=${liveCheckout.checkoutToken}`,
      idempotencyKey: `${liveCheckout._id.toString()}:${customer._id.toString()}:${randomUUID()}`,
      attemptCount: 0,
      maxAttempts: appConfig.payment.maxRetryAttempts || PAYMENT_MAX_RETRY_ATTEMPTS,
      expiresAt: new Date(Date.now() + appConfig.payment.attemptTtlMinutes * 60_000),
    });

    await writeAuditLog({
      action: PAYMENT_AUDIT.PAYMENT_CREATED,
      resourceType: 'payments',
      resourceId: payment._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(payment),
    });

    await publishPaymentEvent(
      PAYMENT_EVENT_TYPE.PAYMENT_CREATED,
      {
        paymentId: payment._id.toString(),
        checkoutToken: payment.checkoutToken,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      },
      { paymentId: payment._id.toString(), checkoutId: liveCheckout._id.toString() },
    );

    return this.createAttempt(payment, customer, actor);
  }

  async retryPayment(
    user: AuthenticatedUser,
    payload: { paymentRef: string; method?: PaymentMethod },
    actor: ActorMeta,
  ) {
    const payment = await this.findByRef(payload.paymentRef);
    const { customer } = await this.assertOwnerOrFinance(payment, user);

    if (!RETRYABLE_STATUSES.includes(payment.status as never)) {
      throw ApiError.badRequest(
        `Payment in status '${payment.status}' cannot be retried`,
        { paymentId: payment._id.toString() },
        'PAYMENT_NOT_RETRYABLE',
      );
    }

    if (payment.attemptCount >= payment.maxAttempts) {
      throw ApiError.badRequest(
        'Maximum retry attempts reached for this payment',
        { paymentId: payment._id.toString(), attemptCount: payment.attemptCount },
        'MAX_RETRIES_REACHED',
      );
    }

    const checkout = await checkoutService.ensurePayableForPayment(
      payment.checkoutId.toString(),
      user,
    );

    // No unpaid stock hold — deduct only after gateway confirms payment.
    if (checkout.reservationIds?.length) {
      await checkoutService.releaseForPaymentFailure(
        checkout._id.toString(),
        'Clear unpaid stock hold before payment retry',
      );
    }
    const liveCheckout = await checkoutService.getByIdOrToken(checkout._id.toString());

    if (payload.method) payment.method = payload.method;
    payment.amount = liveCheckout.totals.grandTotal;
    payment.currency = liveCheckout.currency;
    payment.status = PAYMENT_STATUS.PENDING;
    payment.failureReason = null;
    payment.expiresAt = new Date(Date.now() + appConfig.payment.attemptTtlMinutes * 60_000);
    await payment.save();

    await writeAuditLog({
      action: PAYMENT_AUDIT.PAYMENT_RETRIED,
      resourceType: 'payments',
      resourceId: payment._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { attemptCount: payment.attemptCount + 1 },
    });

    return this.createAttempt(payment, customer, actor);
  }

  private async createAttempt(
    payment: PaymentDocument,
    customer: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      country?: string | null;
    },
    actor: ActorMeta,
  ) {
    const gateway = getGateway(payment.method);
    const attemptNumber = payment.attemptCount + 1;
    const orderId = toAttemptOrderId(payment.referenceNumber, attemptNumber);

    const attempt = await PaymentAttemptModel.create({
      paymentId: payment._id,
      attemptNumber,
      gateway: payment.method,
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
      expiresAt: payment.expiresAt,
    });

    try {
      const checkout = await CheckoutSessionModel.findById(payment.checkoutId).lean();
      const shipping = (checkout?.shippingAddress ?? {}) as Record<string, unknown>;
      const session = await gateway.createSession({
        orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method as PaymentMethod,
        customerEmail: customer.email,
        returnUrl: payment.returnUrl,
        cancelUrl: payment.cancelUrl,
        idempotencyKey: `${payment.idempotencyKey}:${attemptNumber}`,
        metadata: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone ?? undefined,
          country: String(shipping.country ?? customer.country ?? 'LK'),
          address: String(shipping.line1 ?? shipping.address1 ?? ''),
          city: String(shipping.city ?? ''),
          customerId: payment.customerId.toString(),
          customerPhone: customer.phone ?? String(shipping.phone ?? ''),
          ip: actor.ip ?? '',
          deliveryStreet: String(shipping.line1 ?? shipping.address1 ?? ''),
          deliveryRegion: String(shipping.city ?? shipping.state ?? ''),
          deliveryPostcode: String(shipping.postalCode ?? shipping.postcode ?? ''),
          deliveryCountry: String(shipping.country ?? 'LK'),
        },
      });

      attempt.status = PAYMENT_ATTEMPT_STATUS.PROCESSING;
      attempt.gatewayPaymentId = session.gatewayPaymentId;
      attempt.redirectUrl = session.redirectUrl ?? null;
      attempt.requestPayload = { orderId, amount: payment.amount, currency: payment.currency };
      attempt.responsePayload = session.raw ?? null;
      await attempt.save();

      payment.attemptCount = attemptNumber;
      payment.status = PAYMENT_STATUS.PROCESSING;
      payment.gatewayPaymentId = session.gatewayPaymentId;
      payment.redirectUrl = session.redirectUrl ?? null;
      if (session.redirectForm || session.raw?.purchaseId) {
        payment.metadata = {
          ...payment.metadata,
          ...(session.redirectForm ? { redirectForm: session.redirectForm } : {}),
          ...(session.raw?.purchaseId ? { mintpayPurchaseId: String(session.raw.purchaseId) } : {}),
        };
      }
      await payment.save();

      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'attempt.created',
        message: `Attempt #${attemptNumber} created via ${payment.method}`,
        metadata: { gatewayPaymentId: session.gatewayPaymentId },
      });

      if (session.redirectUrl || session.redirectForm) {
        await writeAuditLog({
          action: PAYMENT_AUDIT.GATEWAY_REDIRECT,
          resourceType: 'payments',
          resourceId: payment._id.toString(),
          actorUserId: actor.userId,
          ip: actor.ip,
          requestId: actor.requestId,
          metadata: {
            redirectUrl: session.redirectUrl,
            redirectForm: session.redirectForm?.action,
            gateway: payment.method,
          },
        });
      }

      // Track InitiateCheckout + AddPaymentInfo (fire-and-forget)
      void analyticsService
        .trackInitiateCheckout({
          currency: payment.currency,
          value: payment.amount,
        })
        .catch(() => {});

      void analyticsService
        .trackAddPaymentInfo({
          currency: payment.currency,
          value: payment.amount,
        })
        .catch(() => {});

      // COD has no gateway redirect — create order + clear cart immediately.
      if (payment.method === PAYMENT_METHOD.COD) {
        await fulfillCodPaymentIfNeeded(payment);
      }

      return {
        ...this.toSummary(payment, { includeRedirect: true }),
        redirectForm: session.redirectForm,
      };
    } catch (error) {
      attempt.status = PAYMENT_ATTEMPT_STATUS.FAILED;
      attempt.errorMessage = error instanceof Error ? error.message : 'Unknown gateway error';
      await attempt.save();

      payment.status = PAYMENT_STATUS.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = attempt.errorMessage;
      await payment.save();

      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'attempt.failed',
        level: 'error',
        message: attempt.errorMessage ?? 'Gateway session creation failed',
      });

      // Any leftover hold from older builds — restore Available immediately.
      try {
        await checkoutService.releaseForPaymentFailure(
          payment.checkoutId.toString(),
          'Gateway session creation failed — release hold',
        );
      } catch {
        /* already released */
      }

      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reads                                                              */
  /* ------------------------------------------------------------------ */

  private async findByRef(idOrToken: string) {
    if (Types.ObjectId.isValid(idOrToken)) {
      const byId = await PaymentModel.findOne({ _id: idOrToken, isDeleted: false });
      if (byId) return byId;
    }
    const byToken = await PaymentModel.findOne({
      checkoutToken: idOrToken,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    if (!byToken) throw ApiError.notFound('Payment not found');
    return byToken;
  }

  async getById(idOrToken: string, user: AuthenticatedUser) {
    const payment = await this.findByRef(idOrToken);
    await this.assertOwnerOrFinance(payment, user);
    return this.toSummary(payment, { includeRedirect: true });
  }

  /** Public, checkoutToken-scoped status probe used by gateway return pages. */
  async getStatusByCheckoutToken(checkoutToken: string) {
    const payment = await PaymentModel.findOne({ checkoutToken, isDeleted: false }).sort({
      createdAt: -1,
    });
    if (!payment) throw ApiError.notFound('No payment found for this checkout');

    await this.reconcilePendingKokoPayment(payment);

    // Heal stuck checkouts where payment is already verified but the order was never created.
    await fulfillCodPaymentIfNeeded(payment);
    if (payment.status === PAYMENT_STATUS.PAID) {
      await handlePaymentSucceededEvent({
        paymentId: payment._id.toString(),
        checkoutToken: payment.checkoutToken,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      });
    }

    const order = await OrderModel.findOne({ paymentId: payment._id });

    return {
      checkoutToken: payment.checkoutToken,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      orderId: order?._id.toString() ?? null,
      orderNumber: order?.orderNumber ?? null,
      redirectUrl:
        NON_TERMINAL_STATUSES.includes(payment.status as never) && payment.expiresAt > new Date()
          ? payment.redirectUrl
          : null,
      updatedAt: payment.updatedAt,
    };
  }

  async list(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      method?: string;
      customerId?: string;
      checkoutToken?: string;
    },
    user: AuthenticatedUser,
  ) {
    const isPrivileged = user.permissions.some(
      (p) => p === 'payments.view' || p === 'payments.manage' || p === 'payments.read',
    );
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };

    if (!isPrivileged) {
      const customer = await customerService.ensureForUser(user);
      filter.customerId = customer._id;
    } else if (options.customerId) {
      filter.customerId = options.customerId;
    }

    if (options.status) filter.status = options.status;
    if (options.method) filter.method = options.method;
    if (options.checkoutToken) filter.checkoutToken = options.checkoutToken;

    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(getPaginationSkip(page, limit))
        .limit(limit),
      PaymentModel.countDocuments(filter),
    ]);

    return {
      items: items.map((p) => this.toSummary(p, { includeRedirect: false })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  toSummary(payment: PaymentDocument, opts: { includeRedirect: boolean }) {
    return {
      id: payment._id.toString(),
      referenceNumber: payment.referenceNumber,
      checkoutId: payment.checkoutId.toString(),
      checkoutToken: payment.checkoutToken,
      customerId: payment.customerId.toString(),
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      redirectUrl: opts.includeRedirect ? payment.redirectUrl : undefined,
      attemptCount: payment.attemptCount,
      maxAttempts: payment.maxAttempts,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Webhooks — the ONLY path allowed to mark a payment successful      */
  /* ------------------------------------------------------------------ */

  async handleWebhook(
    gatewayKey: string,
    req: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: Buffer;
      body: unknown;
      ip?: string;
    },
  ): Promise<{ ok: boolean; reason?: string; status?: string; duplicate?: boolean }> {
    const startedAt = Date.now();

    if (!isKnownGateway(gatewayKey)) {
      throw ApiError.badRequest(
        `Unknown payment gateway '${gatewayKey}'`,
        undefined,
        'GATEWAY_NOT_SUPPORTED',
      );
    }

    const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const gateway = getGateway(gatewayKey);
    const eventId = this.computeWebhookEventId(gatewayKey, req.headers, rawBody);

    let webhook;
    try {
      webhook = await PaymentWebhookModel.create({
        gateway: gatewayKey,
        eventId,
        headers: this.plainHeaders(req.headers),
        rawPayload: rawBodyToString(rawBody),
        ip: req.ip ?? null,
        signature:
          getHeader(req.headers, 'md5sig') ??
          getHeader(req.headers, `x-${gatewayKey}-signature`) ??
          null,
      });
    } catch (error) {
      // Duplicate eventId — replay attempt or gateway retry. Idempotent no-op.
      if (this.isDuplicateKeyError(error)) {
        await writeAuditLog({
          action: PAYMENT_AUDIT.WEBHOOK_RECEIVED,
          resourceType: 'payment_webhooks',
          metadata: { gateway: gatewayKey, eventId, duplicate: true },
        });
        return { ok: true, duplicate: true };
      }
      throw error;
    }

    await writeAuditLog({
      action: PAYMENT_AUDIT.WEBHOOK_RECEIVED,
      resourceType: 'payment_webhooks',
      resourceId: webhook._id.toString(),
      metadata: { gateway: gatewayKey, eventId },
    });

    const verification = await gateway.verifyWebhook({ headers: req.headers, rawBody });
    webhook.verified = Boolean(verification.valid);

    if (!verification.valid) {
      webhook.processed = true;
      webhook.processingResult = 'invalid_signature';
      await webhook.save();
      await writeAuditLog({
        action: PAYMENT_AUDIT.VERIFICATION_FAILED,
        resourceType: 'payment_webhooks',
        resourceId: webhook._id.toString(),
        metadata: { gateway: gatewayKey, reason: 'invalid_signature' },
      });
      return { ok: false, reason: 'invalid_signature' as const };
    }

    const attempt = await this.findAttemptForGateway(
      gatewayKey,
      String(verification.orderId ?? ''),
    );

    if (!attempt) {
      return this.failVerification(webhook, gatewayKey, 'unknown_order');
    }

    const payment = await PaymentModel.findOne({ _id: attempt.paymentId, isDeleted: false });
    if (!payment) {
      return this.failVerification(webhook, gatewayKey, 'unknown_payment');
    }

    webhook.paymentId = payment._id;

    if (payment.method !== gatewayKey) {
      return this.failVerification(webhook, gatewayKey, 'gateway_mismatch', payment);
    }

    const amountOk =
      verification.amount === undefined ||
      Number.isNaN(Number(verification.amount)) ||
      Math.abs(Number(verification.amount) - payment.amount) <= 0.01;
    if (!amountOk) {
      return this.failVerification(webhook, gatewayKey, 'amount_mismatch', payment, true);
    }

    const currencyOk =
      !verification.currency ||
      verification.currency.toUpperCase() === payment.currency.toUpperCase();
    if (!currencyOk) {
      return this.failVerification(webhook, gatewayKey, 'currency_mismatch', payment, true);
    }

    const checkoutStillExists = await CheckoutSessionModel.exists({
      _id: payment.checkoutId,
    });
    if (!checkoutStillExists) {
      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'webhook.checkout_missing',
        level: 'warn',
        message: 'Checkout session no longer exists — payment still recorded',
      });
    }

    await writeAuditLog({
      action: PAYMENT_AUDIT.VERIFICATION_SUCCESS,
      resourceType: 'payments',
      resourceId: payment._id.toString(),
      metadata: { gateway: gatewayKey, gatewayTxnId: verification.gatewayTxnId },
    });

    const newStatus = verification.status ?? PAYMENT_STATUS.FAILED;
    const processingTimeMs = Date.now() - startedAt;

    await PaymentTransactionModel.create({
      paymentId: payment._id,
      attemptId: attempt._id,
      gateway: gatewayKey,
      gatewayTransactionId: verification.gatewayTxnId ?? null,
      referenceNumber: payment.referenceNumber,
      amount: verification.amount ?? payment.amount,
      currency: verification.currency ?? payment.currency,
      status: newStatus,
      gatewayResponse: verification.payload ?? null,
      rawPayload: rawBodyToString(rawBody),
      signature: webhook.signature,
      verificationResult: { valid: true, reason: null },
      processingTimeMs,
      retryCount: Math.max(0, payment.attemptCount - 1),
    });

    attempt.status = PAYMENT_TERMINAL_SUCCESS_STATUSES.includes(newStatus as never)
      ? PAYMENT_ATTEMPT_STATUS.SUCCEEDED
      : newStatus === PAYMENT_STATUS.PROCESSING
        ? PAYMENT_ATTEMPT_STATUS.PROCESSING
        : PAYMENT_ATTEMPT_STATUS.FAILED;
    await attempt.save();

    payment.status = newStatus;
    if (newStatus === PAYMENT_STATUS.PAID) payment.paidAt = new Date();
    if (
      [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.EXPIRED].includes(
        newStatus as never,
      )
    ) {
      payment.failedAt = new Date();
      payment.failureReason = `Gateway reported status: ${newStatus}`;
    }
    if (verification.gatewayTxnId) {
      payment.metadata = {
        ...payment.metadata,
        gatewayTxnId: verification.gatewayTxnId,
        ...(gatewayKey === 'payhere' ? { payherePaymentId: verification.gatewayTxnId } : {}),
      };
    }
    await payment.save();

    webhook.processed = true;
    webhook.processingResult = 'success';
    await webhook.save();

    if (newStatus === PAYMENT_STATUS.PAID) {
      await writeAuditLog({
        action: PAYMENT_AUDIT.PAYMENT_COMPLETED,
        resourceType: 'payments',
        resourceId: payment._id.toString(),
        after: toPlain(payment),
      });
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED,
        {
          paymentId: payment._id.toString(),
          checkoutToken: payment.checkoutToken,
          amount: payment.amount,
          currency: payment.currency,
          gatewayTxnId: verification.gatewayTxnId,
        },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );
      await handlePaymentSucceededEvent({
        paymentId: payment._id.toString(),
        checkoutToken: payment.checkoutToken,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      });

      // Send payment success email (fire-and-forget)
      void (async () => {
        try {
          const customer = await customerService
            .getById(payment.customerId.toString())
            .catch(() => null);
          if (customer) {
            const tpl = paymentSuccessfulEmail({
              name:
                (customer as { firstName?: string; email: string }).firstName ??
                (customer as { email: string }).email,
              orderNumber: payment.referenceNumber,
              amount: payment.amount,
              currency: payment.currency,
              method: payment.method,
            });
            await emailQueueService.enqueue({
              ...tpl,
              to: (customer as { email: string }).email,
              templateKey: 'payment_successful',
            });
          }
        } catch {
          /* non-blocking */
        }
      })();

      // Track Purchase (fire-and-forget)
      void analyticsService
        .trackPurchase({
          orderId: payment.referenceNumber,
          currency: payment.currency,
          value: payment.amount,
        })
        .catch(() => {});
    } else if (newStatus === PAYMENT_STATUS.AUTHORIZED) {
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_AUTHORIZED,
        { paymentId: payment._id.toString(), checkoutToken: payment.checkoutToken },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );
    } else {
      await writeAuditLog({
        action: PAYMENT_AUDIT.PAYMENT_FAILED,
        resourceType: 'payments',
        resourceId: payment._id.toString(),
        metadata: { status: newStatus },
      });
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_FAILED,
        {
          paymentId: payment._id.toString(),
          checkoutToken: payment.checkoutToken,
          status: newStatus,
        },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );

      // Restore Available immediately — do not wait solely on the event consumer.
      try {
        await checkoutService.releaseForPaymentFailure(
          payment.checkoutId.toString(),
          `Gateway reported ${newStatus} — release unpaid hold`,
        );
      } catch {
        /* already released / no hold */
      }

      // Send payment failed email (fire-and-forget)
      void (async () => {
        try {
          const customer = await customerService
            .getById(payment.customerId.toString())
            .catch(() => null);
          if (customer) {
            const tpl = paymentFailedEmail({
              name:
                (customer as { firstName?: string; email: string }).firstName ??
                (customer as { email: string }).email,
              orderNumber: payment.referenceNumber,
              amount: payment.amount,
              currency: payment.currency,
              reason: newStatus,
            });
            await emailQueueService.enqueue({
              ...tpl,
              to: (customer as { email: string }).email,
              templateKey: 'payment_failed',
            });
          }
        } catch {
          /* non-blocking */
        }
      })();
    }

    await writePaymentLog({
      paymentId: payment._id.toString(),
      action: 'webhook.processed',
      message: `Webhook from ${gatewayKey} processed — status now ${newStatus}`,
      metadata: { gatewayTxnId: verification.gatewayTxnId, processingTimeMs },
    });

    return { ok: true, status: newStatus };
  }

  /**
   * Mintpay does not POST a signed IPN. The WooCommerce plugin confirms payment when
   * Mintpay redirects the browser to success_url / fail_url with `orderId` + HMAC `hash`.
   */
  async handleMintpayBrowserReturn(
    query: Record<string, unknown>,
  ): Promise<{ ok: boolean; redirectUrl: string }> {
    const orderId = String(query.orderId ?? query.order_id ?? '').trim();
    const hash = String(query.hash ?? '').trim();
    const fallbackSuccess = toPublicStorefrontUrl(
      `${appConfig.email?.shopUrl ?? 'https://fe.lk'}/checkout/success`,
    );
    const fallbackCancel = toPublicStorefrontUrl(
      `${appConfig.email?.shopUrl ?? 'https://fe.lk'}/checkout/cancel`,
    );

    if (!orderId || !hash) {
      logger.warn({ gateway: 'mintpay', orderId }, 'Mintpay return missing orderId or hash');
      return { ok: false, redirectUrl: fallbackCancel };
    }

    const attempt = await this.findAttemptForGateway(PAYMENT_METHOD.MINTPAY, orderId);
    if (!attempt) {
      logger.warn({ gateway: 'mintpay', orderId }, 'Mintpay return: unknown order');
      return { ok: false, redirectUrl: fallbackCancel };
    }

    const payment = await PaymentModel.findOne({ _id: attempt.paymentId, isDeleted: false });
    if (!payment) {
      return { ok: false, redirectUrl: fallbackCancel };
    }

    const received = decodeMintpayBrowserHash(hash);
    const expectedSuccess = hmacSha256Hex(
      appConfig.payment.mintpay.secretKey,
      mintpaySuccessHashMessage(orderId, payment.amount),
    );
    const expectedFail = hmacSha256Hex(
      appConfig.payment.mintpay.secretKey,
      mintpayFailHashMessage(orderId),
    );
    const successMatch = Boolean(received) && safeCompare(received, expectedSuccess);
    const failMatch = Boolean(received) && safeCompare(received, expectedFail);

    const successUrl = toPublicStorefrontUrl(payment.returnUrl || fallbackSuccess);
    const cancelUrl = toPublicStorefrontUrl(payment.cancelUrl || fallbackCancel);

    if (!successMatch && !failMatch) {
      logger.warn({ gateway: 'mintpay', orderId }, 'Mintpay return: hash mismatch');
      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'webhook.verification_failed',
        level: 'error',
        message: 'Mintpay browser return hash mismatch',
      });
      return { ok: false, redirectUrl: cancelUrl };
    }

    if (failMatch && !successMatch) {
      if (!PAYMENT_TERMINAL_SUCCESS_STATUSES.includes(payment.status as never)) {
        payment.status = PAYMENT_STATUS.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = 'Gateway reported status: failed';
        await payment.save();
        attempt.status = PAYMENT_ATTEMPT_STATUS.FAILED;
        await attempt.save();
        await publishPaymentEvent(
          PAYMENT_EVENT_TYPE.PAYMENT_FAILED,
          {
            paymentId: payment._id.toString(),
            checkoutToken: payment.checkoutToken,
            status: PAYMENT_STATUS.FAILED,
          },
          { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
        );
        try {
          await checkoutService.releaseForPaymentFailure(
            payment.checkoutId.toString(),
            'Mintpay fail_url return — release unpaid hold',
          );
        } catch {
          /* already released */
        }
      }
      return { ok: false, redirectUrl: cancelUrl };
    }

    if (payment.status !== PAYMENT_STATUS.PAID) {
      payment.status = PAYMENT_STATUS.PAID;
      payment.paidAt = payment.paidAt ?? new Date();
      payment.failureReason = null;
      const purchaseId =
        typeof payment.metadata?.mintpayPurchaseId === 'string'
          ? payment.metadata.mintpayPurchaseId
          : undefined;
      payment.metadata = {
        ...payment.metadata,
        ...(purchaseId ? { mintpayPurchaseId: purchaseId } : {}),
        mintpayReturnOrderId: orderId,
      };
      await payment.save();
      attempt.status = PAYMENT_ATTEMPT_STATUS.SUCCEEDED;
      await attempt.save();

      await writeAuditLog({
        action: PAYMENT_AUDIT.PAYMENT_COMPLETED,
        resourceType: 'payments',
        resourceId: payment._id.toString(),
        after: toPlain(payment),
      });
      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED,
        {
          paymentId: payment._id.toString(),
          checkoutToken: payment.checkoutToken,
          amount: payment.amount,
          currency: payment.currency,
          gatewayTxnId: purchaseId ?? orderId,
        },
        { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
      );
    }

    await handlePaymentSucceededEvent({
      paymentId: payment._id.toString(),
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });

    await writePaymentLog({
      paymentId: payment._id.toString(),
      action: 'webhook.processed',
      message: 'Mintpay browser return verified — payment paid, order created',
      metadata: { orderId },
    });

    return { ok: true, redirectUrl: successUrl };
  }

  private async reconcilePendingKokoPayment(payment: PaymentDocument): Promise<PaymentDocument> {
    if (payment.method !== PAYMENT_METHOD.KOKO) return payment;
    if (PAYMENT_TERMINAL_SUCCESS_STATUSES.includes(payment.status as never)) return payment;

    const gateway = getGateway(PAYMENT_METHOD.KOKO);
    if (!gateway.verifyTransaction) return payment;

    const attempt = await PaymentAttemptModel.findOne({ paymentId: payment._id }).sort({
      attemptNumber: -1,
    });
    const requestOrderId =
      attempt?.requestPayload && typeof attempt.requestPayload.orderId === 'string'
        ? attempt.requestPayload.orderId
        : '';
    const orderId =
      requestOrderId ||
      toAttemptOrderId(payment.referenceNumber, Math.max(1, payment.attemptCount));

    let result: { status: string; gatewayTxnId?: string } | null = null;
    try {
      result = await gateway.verifyTransaction(orderId);
    } catch (err) {
      logger.warn(
        { err, orderId, paymentId: payment._id.toString() },
        'Koko orderView reconcile failed',
      );
      return payment;
    }
    if (!result || result.status !== PAYMENT_STATUS.PAID) return payment;

    payment.status = PAYMENT_STATUS.PAID;
    payment.paidAt = payment.paidAt ?? new Date();
    payment.failureReason = null;
    payment.metadata = {
      ...payment.metadata,
      kokoReconciled: true,
      ...(result.gatewayTxnId ? { gatewayTxnId: result.gatewayTxnId } : {}),
    };
    await payment.save();

    if (attempt) {
      attempt.status = PAYMENT_ATTEMPT_STATUS.SUCCEEDED;
      if (result.gatewayTxnId) attempt.gatewayPaymentId = result.gatewayTxnId;
      await attempt.save();
    }

    await publishPaymentEvent(
      PAYMENT_EVENT_TYPE.PAYMENT_SUCCEEDED,
      {
        paymentId: payment._id.toString(),
        checkoutToken: payment.checkoutToken,
        amount: payment.amount,
        currency: payment.currency,
        gatewayTxnId: result.gatewayTxnId,
      },
      { paymentId: payment._id.toString(), checkoutId: payment.checkoutId.toString() },
    );
    await handlePaymentSucceededEvent({
      paymentId: payment._id.toString(),
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });

    logger.info(
      { paymentId: payment._id.toString(), orderId, gatewayTxnId: result.gatewayTxnId },
      'Koko: payment marked paid from orderView',
    );
    return payment;
  }

  private async findAttemptForGateway(gatewayKey: string, orderId: string) {
    if (!orderId) return null;

    const byGatewayId = await PaymentAttemptModel.findOne({
      gateway: gatewayKey,
      gatewayPaymentId: orderId,
    }).sort({ createdAt: -1 });
    if (byGatewayId) return byGatewayId;

    const byRequestOrderId = await PaymentAttemptModel.findOne({
      gateway: gatewayKey,
      'requestPayload.orderId': orderId,
    }).sort({ createdAt: -1 });
    if (byRequestOrderId) return byRequestOrderId;

    const baseRef = orderId.replace(/-A\d+$/i, '');
    if (baseRef.startsWith('PAY-')) {
      const payment = await PaymentModel.findOne({
        referenceNumber: baseRef,
        method: gatewayKey,
        isDeleted: false,
      });
      if (payment) {
        return PaymentAttemptModel.findOne({ paymentId: payment._id }).sort({ attemptNumber: -1 });
      }
    }

    const byPurchaseId = await PaymentModel.findOne({
      method: gatewayKey,
      isDeleted: false,
      $or: [{ gatewayPaymentId: orderId }, { 'metadata.mintpayPurchaseId': orderId }],
    }).sort({ createdAt: -1 });
    if (byPurchaseId) {
      return PaymentAttemptModel.findOne({ paymentId: byPurchaseId._id }).sort({
        attemptNumber: -1,
      });
    }

    return null;
  }

  private async failVerification(
    webhook: {
      _id: Types.ObjectId;
      save: () => Promise<unknown>;
      processed: boolean;
      processingResult?: string | null;
      paymentId?: Types.ObjectId | null;
    },
    gatewayKey: string,
    reason: string,
    payment?: PaymentDocument,
    isBusinessFailure = false,
  ) {
    webhook.processed = true;
    webhook.processingResult = reason;
    if (payment) webhook.paymentId = payment._id;
    await webhook.save();

    await writeAuditLog({
      action: PAYMENT_AUDIT.VERIFICATION_FAILED,
      resourceType: 'payments',
      resourceId: payment?._id.toString(),
      metadata: { gateway: gatewayKey, reason },
    });

    if (payment) {
      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'webhook.verification_failed',
        level: 'error',
        message: `Verification failed: ${reason}`,
      });
    }

    return { ok: isBusinessFailure, reason };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: number }).code === 11000,
    );
  }

  private plainHeaders(headers: Record<string, string | string[] | undefined>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (['authorization', 'cookie'].includes(k.toLowerCase())) continue;
      out[k] = v;
    }
    return out;
  }

  private computeWebhookEventId(
    gatewayKey: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): string {
    const payload = parseWebhookPayload(rawBody);
    const natural =
      payload.event_id ??
      payload.eventId ??
      payload.payment_id ??
      payload.transactionId ??
      payload.collectionId ??
      getHeader(headers, 'x-event-id');

    if (natural) return `${String(natural)}`;

    const hash = createHash('sha256').update(rawBody).digest('hex');
    return `sha256:${hash}`;
  }
}

export const paymentService = new PaymentService();
