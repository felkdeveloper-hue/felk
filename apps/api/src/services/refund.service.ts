import { PaymentModel, RefundModel, type RefundDocument } from '@/models/payment.models';
import { publishPaymentEvent } from '@/services/payment-event-publisher';
import { writePaymentLog } from '@/services/payment-log.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { PAYMENT_STATUS } from '@/constants/payment-status';
import { PAYMENT_AUDIT, PAYMENT_EVENT_TYPE, REFUND_STATUS, REFUND_TYPE } from '@/constants/payment';

/**
 * Refund — structure only (Phase 10).
 * Requesting a refund is fully wired (status transitions, audit, event).
 * Actually settling money with the gateway is a future-phase integration;
 * `completeRefund` exists so that wiring has somewhere to land.
 */
export class RefundService {
  async request(
    paymentId: string,
    payload: { amount?: number; reason?: string },
    actor: ActorMeta,
  ) {
    const payment = await PaymentModel.findOne({ _id: paymentId, isDeleted: false });
    if (!payment) throw ApiError.notFound('Payment not found');

    if (
      ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(payment.status as never)
    ) {
      throw ApiError.badRequest(
        `Cannot refund a payment in status '${payment.status}'`,
        { paymentId },
        'PAYMENT_NOT_REFUNDABLE',
      );
    }

    const alreadyRefunded = await RefundModel.aggregate<{ total: number }>([
      { $match: { paymentId: payment._id, status: REFUND_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const refundedSoFar = alreadyRefunded[0]?.total ?? 0;
    const remaining = Number((payment.amount - refundedSoFar).toFixed(2));

    const amount = payload.amount !== undefined ? Number(payload.amount.toFixed(2)) : remaining;
    if (amount <= 0 || amount > remaining) {
      throw ApiError.badRequest(
        `Refund amount must be between 0 and ${remaining}`,
        { remaining },
        'INVALID_REFUND_AMOUNT',
      );
    }

    const refund = await RefundModel.create({
      paymentId: payment._id,
      refundType: amount < remaining ? REFUND_TYPE.PARTIAL : REFUND_TYPE.FULL,
      amount,
      currency: payment.currency,
      reason: payload.reason ?? null,
      status: REFUND_STATUS.PENDING,
      requestedBy: actor.userId ?? null,
      history: [
        {
          status: REFUND_STATUS.PENDING,
          note: 'Refund requested',
          at: new Date(),
          actorUserId: actor.userId ?? null,
        },
      ],
    });

    payment.status = PAYMENT_STATUS.REFUND_PENDING;
    await payment.save();

    await writeAuditLog({
      action: PAYMENT_AUDIT.REFUND_REQUESTED,
      resourceType: 'refunds',
      resourceId: refund._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { paymentId, amount, refundType: refund.refundType },
    });

    await writePaymentLog({
      paymentId,
      action: 'refund.requested',
      message: `Refund of ${amount} ${payment.currency} requested`,
      metadata: { refundId: refund._id.toString() },
    });

    await publishPaymentEvent(
      PAYMENT_EVENT_TYPE.REFUND_REQUESTED,
      { paymentId, refundId: refund._id.toString(), amount, currency: payment.currency },
      { paymentId },
    );

    return this.toSummary(refund);
  }

  /**
   * Structure only — not wired to a route yet. Marks a refund as settled once
   * a future phase calls the gateway's `refund()` (already part of the
   * PaymentGateway interface) and confirms the money actually moved.
   */
  async completeRefund(
    refundId: string,
    result: {
      success: boolean;
      gatewayRefundId?: string;
      gatewayResponse?: Record<string, unknown>;
    },
    actor: ActorMeta,
  ) {
    const refund = await RefundModel.findById(refundId);
    if (!refund) throw ApiError.notFound('Refund not found');

    const payment = await PaymentModel.findById(refund.paymentId);
    if (!payment) throw ApiError.notFound('Payment not found');

    refund.status = result.success ? REFUND_STATUS.COMPLETED : REFUND_STATUS.FAILED;
    refund.gatewayRefundId = result.gatewayRefundId ?? null;
    refund.gatewayResponse = result.gatewayResponse ?? null;
    refund.history.push({
      status: refund.status,
      note: result.success ? 'Refund settled' : 'Refund failed at gateway',
      at: new Date(),
      actorUserId: actor.userId ?? null,
    });
    await refund.save();

    if (result.success) {
      const totalRefunded = await RefundModel.aggregate<{ total: number }>([
        { $match: { paymentId: payment._id, status: REFUND_STATUS.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const refunded = totalRefunded[0]?.total ?? 0;
      payment.status =
        refunded >= payment.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
      await payment.save();

      await writeAuditLog({
        action: PAYMENT_AUDIT.REFUND_COMPLETED,
        resourceType: 'refunds',
        resourceId: refund._id.toString(),
        actorUserId: actor.userId,
        metadata: { paymentId: payment._id.toString() },
      });

      await publishPaymentEvent(
        PAYMENT_EVENT_TYPE.REFUND_COMPLETED,
        {
          paymentId: payment._id.toString(),
          refundId: refund._id.toString(),
          amount: refund.amount,
        },
        { paymentId: payment._id.toString() },
      );
    }

    return this.toSummary(refund);
  }

  async listForPayment(paymentId: string) {
    return RefundModel.find({ paymentId }).sort({ createdAt: -1 });
  }

  async list(options: { page?: number; limit?: number; status?: string }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;

    const [items, total] = await Promise.all([
      RefundModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(getPaginationSkip(page, limit))
        .limit(limit),
      RefundModel.countDocuments(filter),
    ]);

    return {
      items: items.map((r) => this.toSummary(r)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  toSummary(refund: RefundDocument) {
    return {
      id: refund._id.toString(),
      paymentId: refund.paymentId.toString(),
      refundType: refund.refundType,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      gatewayRefundId: refund.gatewayRefundId,
      history: refund.history,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}

export const refundService = new RefundService();
