import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import {
  PaymentModel,
  PaymentAttemptModel,
  PaymentTransactionModel,
  PaymentWebhookModel,
  type PaymentDocument,
} from '@/models/payment.models';
import { CheckoutSessionModel } from '@/models/checkout.models';
import { OrderModel } from '@/models/order.models';
import { checkoutService } from '@/services/checkout.service';
import { customerService } from '@/services/customer.service';
import { getGateway, isKnownGateway } from '@/services/gateways/registry';
import { publishPaymentEvent } from '@/services/payment-event-publisher';
import { writePaymentLog } from '@/services/payment-log.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { appConfig } from '@/config/app.config';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import {
  PAYMENT_STATUS,
  PAYMENT_TERMINAL_SUCCESS_STATUSES,
  PAYMENT_METHOD,
  type PaymentMethod,
} from '@/constants/payment-status';
import { CHECKOUT_STATUS } from '@/constants/checkout';
import {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_AUDIT,
  PAYMENT_EVENT_TYPE,
  PAYMENT_MAX_RETRY_ATTEMPTS,
} from '@/constants/payment';
import { getHeader, parseWebhookPayload, rawBodyToString } from '@/services/gateways/gateway.utils';
import type { AuthenticatedUser } from '@/types';
import { analyticsService } from '@/services/analytics/analytics.service';
import { emailQueueService } from '@/services/email-queue.service';
import { paymentSuccessfulEmail, paymentFailedEmail } from '@/emails';
import { fulfillCodPaymentIfNeeded } from '@/services/order-payment-consumer.service';

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
    const customer = await customerService.ensureForUser(user, actor);
    const checkout = await checkoutService.getByIdOrToken(payload.checkoutRef);

    if (checkout.customerId.toString() !== customer._id.toString()) {
      throw ApiError.forbidden('You can only pay for your own checkout session');
    }

    if (checkout.status !== CHECKOUT_STATUS.READY) {
      throw ApiError.badRequest(
        `Checkout is not ready for payment (status: ${checkout.status})`,
        { checkoutId: checkout._id.toString() },
        'CHECKOUT_NOT_READY',
      );
    }

    if (checkout.reservationExpiresAt && checkout.reservationExpiresAt <= new Date()) {
      throw ApiError.badRequest(
        'Checkout reservation has expired — refresh checkout before paying',
        { checkoutId: checkout._id.toString() },
        'RESERVATION_EXPIRED',
      );
    }

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
        if (payment.attemptCount === 0) {
          // Payment doc exists but its first attempt never completed (e.g. crash
          // between create() and createAttempt()) — finish creating it now.
          return this.createAttempt(payment, customer.email, actor);
        }
        // Idempotent — same in-flight payment. For COD, still ensure order exists.
        await fulfillCodPaymentIfNeeded(payment);
        return this.toSummary(payment, { includeRedirect: true });
      }
      if (!RETRYABLE_STATUSES.includes(payment.status as never)) {
        throw ApiError.conflict(
          'A payment is already in progress for this checkout',
          { paymentId: payment._id.toString(), status: payment.status },
          'PAYMENT_IN_PROGRESS',
        );
      }
      // Existing payment is terminal-failed/expired — guide the client to retry explicitly.
      throw ApiError.conflict(
        'A previous payment attempt exists for this checkout — use /payments/retry',
        { paymentId: payment._id.toString(), status: payment.status },
        'PAYMENT_RETRY_REQUIRED',
      );
    }

    payment = await PaymentModel.create({
      referenceNumber: newReferenceNumber(),
      checkoutId: checkout._id,
      checkoutToken: checkout.checkoutToken,
      customerId: customer._id,
      userId: user.id,
      method: payload.method,
      status: PAYMENT_STATUS.PENDING,
      amount: checkout.totals.grandTotal,
      currency: checkout.currency,
      returnUrl:
        payload.returnUrl ??
        `${appConfig.payment.returnUrl}?checkoutToken=${checkout.checkoutToken}`,
      cancelUrl:
        payload.cancelUrl ??
        `${appConfig.payment.cancelUrl}?checkoutToken=${checkout.checkoutToken}`,
      idempotencyKey: `${checkout._id.toString()}:${customer._id.toString()}:${randomUUID()}`,
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
      { paymentId: payment._id.toString(), checkoutId: checkout._id.toString() },
    );

    return this.createAttempt(payment, customer.email, actor);
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

    const checkout = await CheckoutSessionModel.findOne({
      _id: payment.checkoutId,
      isDeleted: false,
    });
    if (!checkout) {
      throw ApiError.notFound('Checkout session for this payment no longer exists');
    }
    if (checkout.status !== CHECKOUT_STATUS.READY) {
      throw ApiError.badRequest(
        `Checkout is not ready for payment (status: ${checkout.status})`,
        { checkoutId: checkout._id.toString() },
        'CHECKOUT_NOT_READY',
      );
    }

    if (payload.method) payment.method = payload.method;
    payment.amount = checkout.totals.grandTotal;
    payment.currency = checkout.currency;
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

    return this.createAttempt(payment, customer.email, actor);
  }

  private async createAttempt(payment: PaymentDocument, customerEmail: string, actor: ActorMeta) {
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
      const session = await gateway.createSession({
        orderId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method as PaymentMethod,
        customerEmail,
        returnUrl: payment.returnUrl,
        cancelUrl: payment.cancelUrl,
        idempotencyKey: `${payment.idempotencyKey}:${attemptNumber}`,
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
      await payment.save();

      await writePaymentLog({
        paymentId: payment._id.toString(),
        action: 'attempt.created',
        message: `Attempt #${attemptNumber} created via ${payment.method}`,
        metadata: { gatewayPaymentId: session.gatewayPaymentId },
      });

      if (session.redirectUrl) {
        await writeAuditLog({
          action: PAYMENT_AUDIT.GATEWAY_REDIRECT,
          resourceType: 'payments',
          resourceId: payment._id.toString(),
          actorUserId: actor.userId,
          ip: actor.ip,
          requestId: actor.requestId,
          metadata: { redirectUrl: session.redirectUrl, gateway: payment.method },
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

    // Heal stuck COD checkouts where payment exists but order was never created.
    await fulfillCodPaymentIfNeeded(payment);

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

    const attempt = await PaymentAttemptModel.findOne({
      gateway: gatewayKey,
      gatewayPaymentId: verification.orderId,
    });

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
      verification.amount === undefined || Math.abs(verification.amount - payment.amount) <= 0.01;
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
