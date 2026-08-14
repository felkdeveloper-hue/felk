import { Types } from 'mongoose';
import {
  OrderModel,
  OrderNoteModel,
  OrderTimelineModel,
  type OrderDocument,
} from '@/models/order.models.js';
import { CustomerModel } from '@/models/customer.models.js';
import { PaymentModel } from '@/models/payment.models.js';
import { appConfig } from '@/config/app.config.js';
import { customerService } from '@/services/customer.service.js';
import { invoiceService } from '@/services/invoice.service.js';
import {
  renderOrderInvoicePdf,
  renderOrderShippingLabelPdf,
} from '@/services/order-documents/order-document.service.js';
import { recordOrderTimeline } from '@/services/order-timeline.service.js';
import { publishOrderEvent } from '@/services/order-event-publisher.js';
import { writeAuditLog } from '@/services/audit.service.js';
import { inventoryService } from '@/services/inventory.service.js';
import { notifyOrderStatusChange } from '@/services/order-notification.service.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { invoiceTemplate } from '@/services/email/templates/invoice.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { normalizeEmail } from '@/utils/email.helper.js';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination.js';
import {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_ORDER_STATUSES,
  type OrderStatus,
} from '@/constants/order-status.js';
import { ORDER_AUDIT, ORDER_EVENT_TYPE } from '@/constants/order.js';
import { MOVEMENT_TYPE } from '@/constants/inventory.js';
import type { AuthenticatedUser } from '@/types/index.js';
import { orderReceivedAt, paymentReceivedAt } from '@/utils/order-received-at.js';

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
    return this.withReceivedAt(this.toSummary(order));
  }

  async getByOrderNumber(orderNumber: string, user: AuthenticatedUser) {
    const order = await this.findByOrderNumber(orderNumber);
    await this.assertAccess(order, user);
    return this.withReceivedAt(this.toSummary(order));
  }

  /** Public guest lookup — order number + email, or order number + shipping phone. */
  async trackAsGuest(orderNumber: string, emailOrPhoneRaw: string) {
    const lookup = emailOrPhoneRaw.trim();
    const order = await OrderModel.findOne({
      orderNumber: orderNumber.trim(),
      isDeleted: false,
    });
    if (!order) {
      throw ApiError.notFound('Order not found for that order number and email/phone');
    }

    const customer = await CustomerModel.findOne({
      _id: order.customerId,
      isDeleted: false,
    })
      .select('email phone')
      .lean();

    const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');
    const lookupDigits = digits(lookup);
    const shippingPhone = digits(
      String((order.shippingAddress as { phone?: string } | null)?.phone ?? ''),
    );
    const customerPhone = digits(customer?.phone);
    const emailMatch =
      Boolean(lookup.includes('@')) &&
      Boolean(customer?.email) &&
      normalizeEmail(lookup) === normalizeEmail(customer!.email);
    const phoneMatch =
      lookupDigits.length >= 7 &&
      (lookupDigits === shippingPhone || lookupDigits === customerPhone);

    if (!emailMatch && !phoneMatch) {
      throw ApiError.notFound('Order not found for that order number and email/phone');
    }

    const payment = await PaymentModel.findById(order.paymentId)
      .select('paidAt createdAt gatewayPaymentId metadata referenceNumber')
      .lean();
    const receivedAt =
      paymentReceivedAt(payment ?? {}) ?? orderReceivedAt(order) ?? order.createdAt;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      currency: order.currency,
      totals: order.totals,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        name: item.name,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        images: item.images?.slice(0, 1) ?? [],
      })),
      shippingMethod: order.shippingMethod,
      placedAt: receivedAt,
      confirmedAt: order.confirmedAt,
      packedAt: order.packedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    };
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
        .sort({ placedAt: -1, createdAt: -1 })
        .skip(getPaginationSkip(page, limit))
        .limit(limit),
      OrderModel.countDocuments(filter),
    ]);

    return {
      items: await this.withReceivedAtMany(items.map((o) => this.toSummary(o))),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateStatus(
    id: string,
    payload: { status: OrderStatus; note?: string; updateMessage?: string },
    user: AuthenticatedUser,
    actor: ActorMeta,
  ) {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.update']);

    if (payload.status === ORDER_STATUS.CANCELLED) {
      return this.cancel(
        id,
        { reason: payload.note, updateMessage: payload.updateMessage },
        user,
        actor,
      );
    }

    return this.transitionTo(order, payload.status, payload.note, actor, payload.updateMessage);
  }

  async cancel(
    id: string,
    payload: { reason?: string; updateMessage?: string },
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
    return this.transitionTo(
      order,
      ORDER_STATUS.CANCELLED,
      payload.reason,
      actor,
      payload.updateMessage,
    );
  }

  private async transitionTo(
    order: OrderDocument,
    status: OrderStatus,
    note: string | undefined,
    actor: ActorMeta,
    updateMessage?: string,
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

    // Fire-and-forget customer notification — failure must not roll back the status change.
    void notifyOrderStatusChange({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      status,
      updateMessage,
    });

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

  /** Staff-only: email the invoice link to the customer. */
  async sendInvoice(id: string, user: AuthenticatedUser) {
    this.assertStaffOnly(user, ['orders.invoice', 'orders.update', 'orders.view', 'orders.read']);
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.invoice', 'orders.view', 'orders.read']);

    const invoice = await invoiceService.generate(order);
    const customer = await CustomerModel.findById(order.customerId)
      .select('email firstName lastName')
      .lean();

    if (!customer?.email) {
      throw ApiError.badRequest('Customer email not found for this order');
    }

    const name =
      customer.firstName?.trim() ||
      (typeof order.shippingAddress?.fullName === 'string'
        ? order.shippingAddress.fullName.split(' ')[0]
        : '') ||
      'there';
    const orderUrl = `${appConfig.email.shopUrl}/account/orders/${order._id.toString()}/invoice`;
    const template = invoiceTemplate({
      email: customer.email,
      name,
      orderNumber: order.orderNumber,
      invoiceNumber: invoice.invoiceNumber,
      total: order.totals?.grandTotal,
      currency: order.currency,
      orderUrl,
    });

    await emailQueueService.enqueue({
      to: customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      templateKey: 'order_invoice',
    });

    await writeAuditLog({
      action: ORDER_AUDIT.INVOICE_SENT,
      resourceType: 'orders',
      resourceId: order._id.toString(),
      actorUserId: user.id,
      metadata: {
        email: customer.email,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return {
      sent: true,
      email: customer.email,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  async getInvoicePdf(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.invoice', 'orders.view', 'orders.read']);
    const invoice = await invoiceService.generate(order);
    const buffer = await renderOrderInvoicePdf(order, invoice);
    return {
      buffer,
      fileName: `${invoice.invoiceNumber}.pdf`,
    };
  }

  async getShippingLabelPdf(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const order = await this.findById(id);
    await this.assertAccess(order, user, ['orders.invoice', 'orders.view', 'orders.read']);
    const invoice = await invoiceService.generate(order);
    const buffer = await renderOrderShippingLabelPdf(order, invoice);
    return {
      buffer,
      fileName: `${order.orderNumber}-shipping-label.pdf`,
    };
  }

  private async withReceivedAt<
    T extends {
      paymentId: string;
      paidAt?: Date | null;
      placedAt?: Date | null;
      createdAt?: Date;
      receivedAt?: Date;
    },
  >(summary: T): Promise<T> {
    const [enriched] = await this.withReceivedAtMany([summary]);
    return enriched;
  }

  private async withReceivedAtMany<
    T extends {
      paymentId: string;
      paidAt?: Date | null;
      placedAt?: Date | null;
      createdAt?: Date;
      receivedAt?: Date;
    },
  >(summaries: T[]): Promise<T[]> {
    if (!summaries.length) return summaries;
    const ids = [...new Set(summaries.map((row) => row.paymentId).filter(Boolean))];
    const payments = await PaymentModel.find({ _id: { $in: ids } })
      .select('paidAt createdAt gatewayPaymentId metadata referenceNumber')
      .lean();
    const byId = new Map(payments.map((payment) => [String(payment._id), payment]));
    return summaries.map((summary) => {
      const received =
        paymentReceivedAt(byId.get(summary.paymentId) ?? {}) ?? orderReceivedAt(summary);
      if (!received) return summary;
      return { ...summary, receivedAt: received, placedAt: received, paidAt: received };
    });
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
      receivedAt: orderReceivedAt(order),
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
