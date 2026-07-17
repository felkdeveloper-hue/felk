import { ReturnRequestModel, OrderModel } from '@/models/order.models';
import { customerService } from '@/services/customer.service';
import { recordOrderTimeline } from '@/services/order-timeline.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { ORDER_STATUS } from '@/constants/order-status';
import { ORDER_AUDIT, RETURN_STATUS } from '@/constants/order';
import type { AuthenticatedUser } from '@/types';

/**
 * Returns — structure only for Phase 11. No refund/gateway reconciliation
 * logic here; approving a return is expected to later drive the order into
 * REFUND_PENDING via the standard status-transition endpoint.
 */
export class ReturnService {
  async request(
    orderId: string,
    payload: { orderItemId?: string; reason: string; description?: string; images?: string[] },
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });
    if (!order) throw ApiError.notFound('Order not found');

    const customer = await customerService.ensureForUser(user);
    const isOwner = order.customerId.toString() === customer._id.toString();
    const isStaff = user.permissions.some((p: string) => p === 'orders.return_manage');
    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('You can only request a return on your own order');
    }

    if (![ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(order.status as never)) {
      throw ApiError.badRequest(
        'Returns can only be requested after delivery',
        { status: order.status },
        'ORDER_NOT_DELIVERED',
      );
    }

    const returnRequest = await ReturnRequestModel.create({
      orderId: order._id,
      orderItemId: payload.orderItemId ?? null,
      customerId: order.customerId,
      reason: payload.reason,
      description: payload.description ?? null,
      images: payload.images ?? [],
      status: RETURN_STATUS.REQUESTED,
      requestedBy: actor.userId ?? null,
      history: [{ status: RETURN_STATUS.REQUESTED, note: payload.reason, at: new Date() }],
    });

    await writeAuditLog({
      action: ORDER_AUDIT.RETURN_REQUESTED,
      resourceType: 'return_requests',
      resourceId: returnRequest._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { orderId },
    });

    await recordOrderTimeline({
      orderId,
      event: 'return_requested',
      note: payload.reason,
      actorUserId: actor.userId,
      actorType: actor.userId ? 'user' : 'system',
    });

    return returnRequest;
  }

  async listForOrder(orderId: string) {
    return ReturnRequestModel.find({ orderId }).sort({ createdAt: -1 });
  }

  async list(options: { page?: number; limit?: number; status?: string; customerId?: string }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.customerId) filter.customerId = options.customerId;

    const [data, total] = await Promise.all([
      ReturnRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(getPaginationSkip(page, limit))
        .limit(limit),
      ReturnRequestModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}

export const returnService = new ReturnService();
