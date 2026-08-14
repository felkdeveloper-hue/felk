import type { InvoiceDocument, OrderDocument } from '@/models/order.models.js';
import {
  DEFAULT_ORDER_DOCUMENT_BRANDING,
  type OrderDocumentPayload,
} from './order-document.types.js';
import { generateInvoicePdf } from './invoice-pdf.generator.js';
import { generateShippingLabelPdf } from './shipping-label-pdf.generator.js';

function readAddress(address?: Record<string, unknown> | null) {
  if (!address) return {};
  return {
    fullName: typeof address.fullName === 'string' ? address.fullName : null,
    phone: typeof address.phone === 'string' ? address.phone : null,
    line1: typeof address.line1 === 'string' ? address.line1 : null,
    line2: typeof address.line2 === 'string' ? address.line2 : null,
    city: typeof address.city === 'string' ? address.city : null,
    state: typeof address.state === 'string' ? address.state : null,
    postalCode: typeof address.postalCode === 'string' ? address.postalCode : null,
    country: typeof address.country === 'string' ? address.country : null,
  };
}

function paymentStatus(order: OrderDocument, invoice: InvoiceDocument): string {
  if (order.paidAt) return 'SUCCESS';
  if (order.status === 'cancelled') return 'CANCELLED';
  if (order.paymentMethod === 'cod') return 'PENDING';
  return 'SUCCESS';
}

export function buildOrderDocumentPayload(
  order: OrderDocument,
  invoice: InvoiceDocument,
): OrderDocumentPayload {
  const recipient = readAddress(order.shippingAddress ?? order.billingAddress);

  return {
    orderNumber: order.orderNumber,
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt ?? order.createdAt,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    paymentStatus: paymentStatus(order, invoice),
    recipient,
    items: order.items.map((item) => ({
      name: item.name,
      variantTitle: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    totals: {
      subtotal: order.totals.subtotal,
      shipping: order.totals.shipping,
      discount: order.totals.discount,
      tax: order.totals.tax,
      grandTotal: order.totals.grandTotal,
      totalWeightGrams: order.totals.totalWeightGrams,
    },
    branding: DEFAULT_ORDER_DOCUMENT_BRANDING,
  };
}

export async function renderOrderInvoicePdf(
  order: OrderDocument,
  invoice: InvoiceDocument,
): Promise<Buffer> {
  return generateInvoicePdf(buildOrderDocumentPayload(order, invoice));
}

export async function renderOrderShippingLabelPdf(
  order: OrderDocument,
  invoice: InvoiceDocument,
): Promise<Buffer> {
  return generateShippingLabelPdf(buildOrderDocumentPayload(order, invoice));
}
