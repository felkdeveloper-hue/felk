import type {
  CheckoutAddressSnapshot,
  CheckoutLine,
  CheckoutSession,
  CheckoutTotals,
  CheckoutValidationIssue,
} from '@/services/sdk';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function normalizeAddress(raw: unknown): CheckoutAddressSnapshot | null {
  if (!raw) return null;
  const record = asRecord(raw);
  return {
    addressId: String(record.addressId ?? record._id ?? ''),
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

function normalizeLine(raw: unknown): CheckoutLine {
  const record = asRecord(raw);
  return {
    cartItemId: record.cartItemId ? String(record.cartItemId) : undefined,
    productId: String(record.productId ?? ''),
    variantId: String(record.variantId ?? ''),
    sku: String(record.sku ?? ''),
    title: String(record.title ?? 'Product'),
    quantity: Number(record.quantity ?? 1),
    unitPrice: Number(record.unitPrice ?? record.currentPrice ?? 0),
    salePrice: record.salePrice != null ? Number(record.salePrice) : undefined,
    compareAtPrice: record.compareAtPrice != null ? Number(record.compareAtPrice) : undefined,
    lineSubtotal: Number(record.lineSubtotal ?? 0),
    colorName: typeof record.colorName === 'string' ? record.colorName : undefined,
    sizeName: typeof record.sizeName === 'string' ? record.sizeName : undefined,
    thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : undefined,
  };
}

function normalizeTotals(raw: unknown, currency: string): CheckoutTotals {
  const record = asRecord(raw);
  return {
    subtotal: Number(record.subtotal ?? 0),
    discount: Number(record.discount ?? 0),
    shipping: Number(record.shipping ?? 0),
    tax: Number(record.tax ?? 0),
    giftCard: Number(record.giftCard ?? 0),
    grandTotal: Number(record.grandTotal ?? record.total ?? 0),
    totalQuantity: Number(record.totalQuantity ?? 0),
    currency,
  };
}

function normalizeIssues(raw: unknown): CheckoutValidationIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((issue) => {
    const record = asRecord(issue);
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: String(record.message ?? record.reason ?? 'Validation issue'),
      severity: record.severity === 'warning' ? 'warning' : 'error',
      variantId: record.variantId ? String(record.variantId) : undefined,
    };
  });
}

export function normalizeCheckoutSession(raw: unknown): CheckoutSession {
  const record = asRecord(raw);
  const totalsRaw = asRecord(record.totals);
  const currency = String(record.currency ?? totalsRaw.currency ?? 'LKR');
  const summary = asRecord(record.summary);
  const totals = normalizeTotals(record.totals, currency);

  return {
    id: String(record.id ?? record._id ?? ''),
    checkoutToken: String(record.checkoutToken ?? record.token ?? ''),
    status: String(record.status ?? 'open') as CheckoutSession['status'],
    currency,
    lines: Array.isArray(record.lines) ? record.lines.map(normalizeLine) : [],
    shippingAddress: normalizeAddress(record.shippingAddress),
    billingAddress: normalizeAddress(record.billingAddress),
    shippingMethod: typeof record.shippingMethod === 'string' ? record.shippingMethod : 'standard',
    deliveryMethod: typeof record.deliveryMethod === 'string' ? record.deliveryMethod : undefined,
    shippingEstimate: asRecord(record.shippingEstimate),
    taxEstimate: asRecord(record.taxEstimate),
    coupon: asRecord(record.coupon),
    giftCard: asRecord(record.giftCard),
    totals,
    reservationExpiresAt:
      typeof record.reservationExpiresAt === 'string'
        ? record.reservationExpiresAt
        : record.reservationExpiresAt instanceof Date
          ? record.reservationExpiresAt.toISOString()
          : null,
    expiresAt:
      typeof record.expiresAt === 'string'
        ? record.expiresAt
        : record.expiresAt instanceof Date
          ? record.expiresAt.toISOString()
          : null,
    validationIssues: normalizeIssues(record.validationIssues),
    readyForPayment: Boolean(summary.readyForPayment ?? record.status === 'ready'),
    valid: record.valid !== undefined ? Boolean(record.valid) : undefined,
    issues: record.issues ? normalizeIssues(record.issues) : undefined,
  };
}

export function checkoutRef(idOrToken: string): { id?: string; checkoutToken?: string } {
  if (/^[a-f\d]{24}$/i.test(idOrToken)) {
    return { id: idOrToken };
  }
  return { checkoutToken: idOrToken };
}
