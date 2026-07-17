import type {
  Order,
  OrderAddressSnapshot,
  OrderInvoice,
  OrderLineItem,
  OrderReturn,
  OrderTimelineEntry,
  OrderTotals,
  OrderTrackingInfo,
} from '@/services/sdk';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function normalizeAddress(raw: unknown): OrderAddressSnapshot | null {
  if (!raw) return null;
  const record = asRecord(raw);
  return {
    fullName: String(record.fullName ?? ''),
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    line1: String(record.line1 ?? ''),
    line2: typeof record.line2 === 'string' ? record.line2 : null,
    city: String(record.city ?? ''),
    state: typeof record.state === 'string' ? record.state : null,
    postalCode: String(record.postalCode ?? ''),
    country: String(record.country ?? ''),
  };
}

function normalizeLineItem(raw: unknown): OrderLineItem {
  const record = asRecord(raw);
  const images = Array.isArray(record.images) ? record.images.map((image) => String(image)) : [];
  return {
    id: String(record.id ?? record._id ?? ''),
    productId: String(record.productId ?? ''),
    variantId: String(record.variantId ?? ''),
    name: String(record.name ?? 'Product'),
    variantTitle: typeof record.variantTitle === 'string' ? record.variantTitle : undefined,
    sku: String(record.sku ?? ''),
    images,
    thumbnailUrl: images[0],
    price: Number(record.price ?? 0),
    salePrice: record.salePrice != null ? Number(record.salePrice) : undefined,
    discount: Number(record.discount ?? 0),
    tax: Number(record.tax ?? 0),
    shipping: Number(record.shipping ?? 0),
    quantity: Number(record.quantity ?? 1),
    lineSubtotal: Number(record.lineSubtotal ?? 0),
    lineTotal: Number(record.lineTotal ?? record.lineSubtotal ?? 0),
  };
}

function normalizeTotals(raw: unknown, currency: string): OrderTotals {
  const record = asRecord(raw);
  return {
    subtotal: Number(record.subtotal ?? 0),
    discount: Number(record.discount ?? 0),
    shipping: Number(record.shipping ?? 0),
    tax: Number(record.tax ?? 0),
    giftCard: Number(record.giftCard ?? 0),
    grandTotal: Number(record.grandTotal ?? record.total ?? 0),
    totalQuantity: Number(record.totalQuantity ?? 0),
    totalWeightGrams: Number(record.totalWeightGrams ?? 0),
    currency,
  };
}

function toIso(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function normalizeTracking(metadata: UnknownRecord): OrderTrackingInfo | null {
  const tracking = asRecord(metadata.tracking ?? metadata.shipment);
  if (!tracking.carrier && !tracking.trackingNumber && !tracking.trackingUrl) return null;
  return {
    carrier: typeof tracking.carrier === 'string' ? tracking.carrier : undefined,
    trackingNumber:
      typeof tracking.trackingNumber === 'string' ? tracking.trackingNumber : undefined,
    trackingUrl: typeof tracking.trackingUrl === 'string' ? tracking.trackingUrl : undefined,
    estimatedDelivery:
      typeof tracking.estimatedDelivery === 'string' ? tracking.estimatedDelivery : undefined,
  };
}

export function normalizeOrder(raw: unknown): Order {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'LKR');
  const metadata = asRecord(record.metadata);

  return {
    id: String(record.id ?? record._id ?? ''),
    orderNumber: String(record.orderNumber ?? ''),
    status: String(record.status ?? 'pending'),
    paymentStatus: derivePaymentStatus(record),
    currency,
    items: Array.isArray(record.items) ? record.items.map(normalizeLineItem) : [],
    shippingAddress: normalizeAddress(record.shippingAddress),
    billingAddress: normalizeAddress(record.billingAddress),
    shippingMethod: typeof record.shippingMethod === 'string' ? record.shippingMethod : undefined,
    deliveryMethod: typeof record.deliveryMethod === 'string' ? record.deliveryMethod : undefined,
    totals: normalizeTotals(record.totals, currency),
    paymentMethod: typeof record.paymentMethod === 'string' ? record.paymentMethod : undefined,
    paymentReference:
      typeof record.paymentReference === 'string' ? record.paymentReference : undefined,
    paidAt: toIso(record.paidAt),
    placedAt: toIso(record.placedAt),
    confirmedAt: toIso(record.confirmedAt),
    packedAt: toIso(record.packedAt),
    readyForShipmentAt: toIso(record.readyForShipmentAt),
    shippedAt: toIso(record.shippedAt),
    deliveredAt: toIso(record.deliveredAt),
    completedAt: toIso(record.completedAt),
    cancelledAt: toIso(record.cancelledAt),
    cancelReason: typeof record.cancelReason === 'string' ? record.cancelReason : undefined,
    tracking: normalizeTracking(metadata),
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}

function derivePaymentStatus(record: UnknownRecord): string {
  const status = String(record.status ?? '');
  if (status === 'refunded') return 'refunded';
  if (status === 'refund_pending') return 'refund_pending';
  if (status === 'cancelled') return 'cancelled';
  if (record.paidAt) return 'paid';
  return 'paid';
}

export function normalizeTimelineEntry(raw: unknown): OrderTimelineEntry {
  const record = asRecord(raw);
  return {
    id: String(record.id ?? record._id ?? ''),
    event: String(record.event ?? ''),
    status: typeof record.status === 'string' ? record.status : undefined,
    note: typeof record.note === 'string' ? record.note : undefined,
    actorType: record.actorType === 'user' ? 'user' : 'system',
    createdAt: toIso(record.createdAt) ?? new Date().toISOString(),
  };
}

export function normalizeInvoice(raw: unknown): OrderInvoice {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'LKR');
  const pdf = asRecord(record.pdf);

  return {
    id: String(record.id ?? record._id ?? ''),
    invoiceNumber: String(record.invoiceNumber ?? ''),
    orderId: String(record.orderId ?? ''),
    orderNumber: String(record.orderNumber ?? ''),
    currency,
    billingAddress: normalizeAddress(record.billingAddress),
    shippingAddress: normalizeAddress(record.shippingAddress),
    items: Array.isArray(record.items)
      ? record.items.map((item) => {
          const line = asRecord(item);
          return {
            name: String(line.name ?? ''),
            sku: String(line.sku ?? ''),
            quantity: Number(line.quantity ?? 1),
            price: Number(line.price ?? 0),
            discount: Number(line.discount ?? 0),
            tax: Number(line.tax ?? 0),
            lineTotal: Number(line.lineTotal ?? 0),
          };
        })
      : [],
    totals: normalizeTotals(record.totals, currency),
    paymentReference: String(record.paymentReference ?? ''),
    paymentMethod: String(record.paymentMethod ?? ''),
    pdf: {
      status: String(pdf.status ?? 'not_generated'),
      url: typeof pdf.url === 'string' ? pdf.url : null,
      message: typeof pdf.message === 'string' ? pdf.message : undefined,
    },
    issuedAt: toIso(record.issuedAt),
  };
}

export function normalizeReturn(raw: unknown): OrderReturn {
  const record = asRecord(raw);
  return {
    id: String(record.id ?? record._id ?? ''),
    orderId: String(record.orderId ?? ''),
    orderItemId: record.orderItemId ? String(record.orderItemId) : undefined,
    status: String(record.status ?? 'requested'),
    reason: String(record.reason ?? ''),
    description: typeof record.description === 'string' ? record.description : undefined,
    images: Array.isArray(record.images) ? record.images.map((image) => String(image)) : [],
    history: Array.isArray(record.history)
      ? record.history.map((entry) => {
          const item = asRecord(entry);
          return {
            status: String(item.status ?? ''),
            note: typeof item.note === 'string' ? item.note : undefined,
            at: toIso(item.at) ?? new Date().toISOString(),
          };
        })
      : [],
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}
