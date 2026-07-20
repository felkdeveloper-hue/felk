import type { CartLineItem, CartTotals, CartValidationResult, CartView } from '@/services/sdk';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function asMoney(amount: number, currency: string) {
  return { amount, currency };
}

export function normalizeCartLineItem(raw: unknown): CartLineItem {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'LKR');
  const unitPrice = Number(record.currentPrice ?? record.unitPrice ?? 0);
  const salePrice = record.salePrice != null ? Number(record.salePrice) : undefined;

  return {
    id: String(record.id ?? record._id ?? ''),
    productId: String(record.productId ?? ''),
    productSlug: typeof record.productSlug === 'string' ? record.productSlug : undefined,
    variantId: record.variantId ? String(record.variantId) : undefined,
    name: String(record.title ?? record.name ?? 'Product'),
    sku: typeof record.sku === 'string' ? record.sku : undefined,
    quantity: Number(record.quantity ?? 1),
    unitPrice,
    totalPrice: Number(
      record.lineSubtotal ?? record.totalPrice ?? unitPrice * Number(record.quantity ?? 1),
    ),
    imageUrl:
      typeof record.thumbnailUrl === 'string'
        ? record.thumbnailUrl
        : typeof record.imageUrl === 'string'
          ? record.imageUrl
          : undefined,
    colorName: typeof record.colorName === 'string' ? record.colorName : undefined,
    sizeName: typeof record.sizeName === 'string' ? record.sizeName : undefined,
    salePrice,
    compareAtPrice: record.compareAtPrice != null ? Number(record.compareAtPrice) : undefined,
    priceChanged: Boolean(record.priceChanged),
    priceDifference: Number(record.priceDifference ?? 0),
    currency,
    price: asMoney(unitPrice, currency),
    salePriceMoney: salePrice != null ? asMoney(salePrice, currency) : undefined,
    inStock: record.inStock !== false,
    stockStatus: typeof record.stockStatus === 'string' ? record.stockStatus : undefined,
  };
}

export function normalizeCartTotals(raw: unknown): CartTotals {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'LKR');
  const subtotal = Number(record.subtotal ?? 0);
  const discount = Number(record.discount ?? record.discountPlaceholder ?? 0);
  const taxRecord = asRecord(record.taxEstimate);
  const shippingRecord = asRecord(record.shippingEstimate);
  const tax = Number(record.estimatedTax ?? record.tax ?? taxRecord.amount ?? 0);
  const shipping = Number(
    record.estimatedShipping ?? record.shipping ?? shippingRecord.amount ?? 0,
  );
  const total = Number(record.grandTotal ?? record.total ?? subtotal - discount + tax + shipping);

  return {
    subtotal,
    discount,
    tax,
    shipping,
    total,
    currency,
    totalQuantity: Number(record.totalQuantity ?? 0),
    itemCount: Number(record.itemCount ?? 0),
    taxEstimate: asRecord(record.taxEstimate),
    shippingEstimate: asRecord(record.shippingEstimate),
  };
}

export function normalizeCartValidation(raw: unknown): CartValidationResult | undefined {
  if (!raw) return undefined;
  const record = asRecord(raw);
  const issues = Array.isArray(record.issues)
    ? record.issues.map((issue) => {
        const entry = asRecord(issue);
        return {
          itemId: entry.itemId ? String(entry.itemId) : undefined,
          variantId: entry.variantId ? String(entry.variantId) : undefined,
          reason: String(entry.message ?? entry.reason ?? 'Validation issue'),
          code: typeof entry.code === 'string' ? entry.code : undefined,
          severity: entry.severity === 'warning' ? ('warning' as const) : ('error' as const),
        };
      })
    : undefined;

  return {
    isValid: Boolean(
      record.valid ?? record.isValid ?? !issues?.some((i) => i.severity === 'error'),
    ),
    issues,
  };
}

export function normalizeCartView(raw: unknown): CartView {
  const record = asRecord(raw);
  const cartMeta = asRecord(record.cart);

  return {
    id: String(cartMeta.id ?? cartMeta._id ?? record.id ?? ''),
    items: Array.isArray(record.items) ? record.items.map(normalizeCartLineItem) : [],
    savedItems: Array.isArray(record.savedForLater)
      ? record.savedForLater.map(normalizeCartLineItem)
      : Array.isArray(record.savedItems)
        ? record.savedItems.map(normalizeCartLineItem)
        : undefined,
    totals: normalizeCartTotals(record.totals),
    guestCartToken:
      typeof record.guestCartToken === 'string'
        ? record.guestCartToken
        : typeof cartMeta.guestToken === 'string'
          ? cartMeta.guestToken
          : undefined,
    validation: normalizeCartValidation(record.validation),
    status: typeof cartMeta.status === 'string' ? cartMeta.status : undefined,
  };
}

export function resolveVariantId(
  variantId?: string,
  product?: { defaultVariantId?: string; variants?: Array<{ id: string }> },
): string | undefined {
  if (variantId) return variantId;
  if (product?.defaultVariantId) return product.defaultVariantId;
  return product?.variants?.[0]?.id;
}
