import { InvoiceModel, type OrderDocument } from '@/models/order.models';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { INVOICE_TAX_PLACEHOLDER, ORDER_AUDIT } from '@/constants/order';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function newInvoiceNumber(orderNumber: string) {
  return `INV-${orderNumber}`;
}

export class InvoiceService {
  /** Idempotent — returns the existing invoice if one already exists for this order. */
  async generate(order: OrderDocument, actor: ActorMeta = {}) {
    const existing = await InvoiceModel.findOne({ orderId: order._id });
    if (existing) return existing;

    const invoice = await InvoiceModel.create({
      invoiceNumber: newInvoiceNumber(order.orderNumber),
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      currency: order.currency,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: item.salePrice ?? item.price,
        discount: item.discount,
        tax: item.tax,
        lineTotal: item.lineTotal,
      })),
      totals: order.totals,
      taxDetails: INVOICE_TAX_PLACEHOLDER,
      paymentReference: order.paymentReference,
      paymentMethod: order.paymentMethod,
    });

    await writeAuditLog({
      action: ORDER_AUDIT.INVOICE_GENERATED,
      resourceType: 'invoices',
      resourceId: invoice._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(invoice),
      metadata: { orderId: order._id.toString() },
    });

    return invoice;
  }

  async getByOrderId(orderId: string) {
    const invoice = await InvoiceModel.findOne({ orderId });
    if (!invoice) throw ApiError.notFound('Invoice not found for this order');
    return invoice;
  }
}

export const invoiceService = new InvoiceService();
