import { Types } from 'mongoose';
import {
  OrderModel,
  OrderNoteModel,
  OrderTimelineModel,
  type OrderDocument,
} from '@/models/order.models';
import { customerService } from '@/services/customer.service';
import { invoiceService } from '@/services/invoice.service';
import { recordOrderTimeline } from '@/services/order-timeline.service';
import { publishOrderEvent } from '@/services/order-event-publisher';
import { writeAuditLog } from '@/services/audit.service';
import { inventoryService } from '@/services/inventory.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_ORDER_STATUSES,
  type OrderStatus,
} from '@/constants/order-status';
import { ORDER_AUDIT, ORDER_EVENT_TYPE } from '@/constants/order';
import { MOVEMENT_TYPE } from '@/constants/inventory';
import type { AuthenticatedUser } from '@/types';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

const STAGE_TIMESTAMP_FIELD: Partial<Record<OrderStatus, keyof OrderDocument>> = {
  [ORDER_STATUS.CONFIRMED]: 'confirmedAt',
  [ORDER_STATUS.PACKED]: 'packedAt',
  [ORDER_STATUS.READY_FOR_SHIPMENT]: 'readyForShipmentAt',
  [ORDER_STATUS.SHIPPED]: 'shippedAt',
  [ORDER_STATUS.DELIVERED]: 'deliveredAt',
  [ORDER_STATUS.COMPLETED]: 'completedAt',
  [ORDER_STATUS.CANCELLED]: 'cancelledAt',
};

export class OrderService {
  private async assertAccess(
    order: OrderDocument,
    user: AuthenticatedUser,
    staffPerms: string[] = ['orders.view', 'orders.read'],
  ) {
    const customer = await customerService.ensureForUser(user);
    const isOwner = order.customerId.toString() === customer._id.toString();
    const isStaff = user.permissions.some((p) => staffPerms.includes(p));
    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('You can only access your own orders');
    }
    return { customer, isOwner, isStaff };
  }

  /** Staff-only gate — ownership never bypasses this (e.g. internal notes). */
  private assertStaffOnly(user: AuthenticatedUser, perms: string[]) {
    const isStaff = user.permissions.some((p: string) => perms.includes(p));
    if (!isStaff) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
  }

  private async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Order not found');
    const order = await OrderModel.findOne({ _id: id, isDeleted: false });
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  private async findByOrderNumber(orderNumber: string) {
    const order = await OrderModel.findOne({ orderNumber, isDeleted: false });
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  async getById(id: string, user: AuthenticatedUser) {
    const order = await this.findById(id);
    await this.assertAccess(order, user);
    return this.toSummary(order);
  }

  async getByOrderNumber(orderNumber: string, user: AuthenticatedUser) {
    const order = await this.findByOrderNumber(orderNumber);
    await this.assertAccess(order, user);
    return this.toSummary(order);
  }

  async list(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      customerId?: string;
      q?: string;
    },
    user: AuthenticatedUser,
  ) {
    const isStaff = user.permissions.some((p: string) =>
      ['orders.view', 'orders.read'].includes(p),
    );
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };

    if (!isStaff) {
      const customer = await customerService.ensureForUser(user);
      filter.customerId = customer._id;
    } else if (options.customerId) {
      filter.customerId = options.customerId;
    }

    if (options.status) filter.status = options.status;
    if (options.q) {
      filter.orderNumber = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(getPaginationSkip(page, limit))
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);

    return {
      items: items.map((o) => this.toSummary(o)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateStatus(
    id: string,
    payload: { status: OrderStatus; note?: string },
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.update']);

    if (payload.status === ORDER_STATUS.CANCELLED) {
      return this.cancel(id, { reason: payload.note }, user, actor);
    }

    return this.transitionTo(order, payload.status, payload.note, actor);
  }

  async cancel(
    id: string,
    payload: { reason?: string },
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.cancel']);

    if (order.status === ORDER_STATUS.CANCELLED) {
      return this.toSummary(order);
    }

    if (!CANCELLABLE_ORDER_STATUSES.includes(order.status as never)) {
      throw ApiError.badRequest(
        `Order in status '${order.status}' can no longer be cancelled — use a return instead`,
        { orderId: id },
        'ORDER_NOT_CANCELLABLE',
      );
    }

    // Reverse the permanent inventory commit made when the order was created.
    for (const item of order.items) {
      if (!item.warehouseId) continue;
      try {
        await inventoryService.applyMovement(
          {
            warehouseId: item.warehouseId.toString(),
            variantId: item.variantId.toString(),
            type: MOVEMENT_TYPE.RETURN,
            quantity: item.quantity,
            referenceType: 'order_cancel',
            referenceId: order._id.toString(),
            note: `Order ${order.orderNumber} cancelled`,
          },
          actor,
        );
      } catch {
        // Ledger race or already-reversed — do not block cancellation on inventory bookkeeping.
      }
    }

    order.cancelReason = payload.reason ?? null;
    return this.transitionTo(order, ORDER_STATUS.CANCELLED, payload.reason, actor);
  }

  private async transitionTo(
    order: OrderDocument,
    status: OrderStatus,
    note: string | undefined,
    actor: ActorMeta,
  ) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(status)) {
      throw ApiError.badRequest(
        `Cannot transition order from '${order.status}' to '${status}'`,
        { from: order.status, to: status, allowed },
        'INVALID_TRANSITION',
      );
    }

    const before = toPlain(order);
    order.status = status;
    const tsField = STAGE_TIMESTAMP_FIELD[status];
    if (tsField) {
      (order as unknown as Record<string, unknown>)[tsField] = new Date();
    }
    order.version += 1;
    await order.save();

    await writeAuditLog({
      action: ORDER_AUDIT.STATUS_CHANGED,
      resourceType: 'orders',
      resourceId: order._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before,
      after: toPlain(order),
      metadata: { from: before.status, to: status },
    });

    await recordOrderTimeline({
      orderId: order._id.toString(),
      event: status,
      status,
      note,
      actorUserId: actor.userId,
      actorType: actor.userId ? 'user' : 'system',
    });

    if (status === ORDER_STATUS.CANCELLED) {
      await writeAuditLog({
        action: ORDER_AUDIT.CANCELLED,
        resourceType: 'orders',
        resourceId: order._id.toString(),
        actorUserId: actor.userId,
        metadata: { reason: note },
      });
      await publishOrderEvent(
        ORDER_EVENT_TYPE.ORDER_CANCELLED,
        { orderId: order._id.toString(), orderNumber: order.orderNumber, reason: note ?? null },
        { orderId: order._id.toString(), paymentId: order.paymentId.toString() },
      );
    }

    if (status === ORDER_STATUS.DELIVERED) {
      await publishOrderEvent(
        ORDER_EVENT_TYPE.ORDER_DELIVERED,
        { orderId: order._id.toString(), orderNumber: order.orderNumber },
        { orderId: order._id.toString(), paymentId: order.paymentId.toString() },
      );
    }

    if (status === ORDER_STATUS.REFUND_PENDING) {
      await publishOrderEvent(
        ORDER_EVENT_TYPE.ORDER_REFUND_REQUESTED,
        {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          amount: order.totals.grandTotal,
          currency: order.currency,
        },
        { orderId: order._id.toString(), paymentId: order.paymentId.toString() },
      );
    }

    return this.toSummary(order);
  }

  async addNote(
    id: string,
    payload: { note: string; isInternal?: boolean },
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    const order = await this.findById(id);
    this.assertStaffOnly(user, ['orders.notes']);

    const note = await OrderNoteModel.create({
      orderId: order._id,
      note: payload.note,
      isInternal: payload.isInternal ?? true,
      authorUserId: actor.userId ?? null,
    });

    await writeAuditLog({
      action: ORDER_AUDIT.NOTE_ADDED,
      resourceType: 'order_notes',
      resourceId: note._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { orderId: id },
    });

    await recordOrderTimeline({
      orderId: id,
      event: 'note_added',
      note: payload.note,
      actorUserId: actor.userId,
      actorType: 'user',
    });

    return note;
  }

  async listNotes(id: string, user: AuthenticatedUser) {
    await this.findById(id);
    this.assertStaffOnly(user, ['orders.notes']);
    return OrderNoteModel.find({ orderId: id }).sort({ createdAt: -1 });
  }

  async listTimeline(id: string, user: AuthenticatedUser) {
    const order = await this.findById(id);
    await this.assertAccess(order, user);
    return OrderTimelineModel.find({ orderId: id }).sort({ createdAt: 1 });
  }

  async getInvoice(id: string, user: AuthenticatedUser) {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.invoice', 'orders.view', 'orders.read']);
    return invoiceService.generate(order);
  }

  toSummary(order: OrderDocument) {
    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      paymentId: order.paymentId.toString(),
      checkoutToken: order.checkoutToken,
      customerId: order.customerId.toString(),
      status: order.status,
      items: order.items.map((item) => ({
        id: item._id.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        name: item.name,
        variantTitle: item.variantTitle,
        sku: item.sku,
        barcode: item.barcode,
        images: item.images,
        price: item.price,
        salePrice: item.salePrice,
        discount: item.discount,
        tax: item.tax,
        shipping: item.shipping,
        quantity: item.quantity,
        weightGrams: item.weightGrams,
        lineSubtotal: item.lineSubtotal,
        lineTotal: item.lineTotal,
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      shippingMethod: order.shippingMethod,
      deliveryMethod: order.deliveryMethod,
      currency: order.currency,
      totals: order.totals,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      packedAt: order.packedAt,
      readyForShipmentAt: order.readyForShipmentAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

export const orderService = new OrderService();
