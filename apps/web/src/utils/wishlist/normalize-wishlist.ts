import type { Wishlist, WishlistItem } from '@/services/sdk';
import type { ProductMoney } from '@/services/sdk';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

export interface EnrichedWishlistItem extends WishlistItem {
  productName?: string;
  productSlug?: string;
  productStatus?: string;
  variantSku?: string;
  variantTitle?: string;
  thumbnailUrl?: string;
  price?: ProductMoney;
  salePrice?: ProductMoney;
}

function readMoney(value: unknown, fallbackCurrency: string): ProductMoney | undefined {
  if (value && typeof value === 'object') {
    const record = asRecord(value);
    // API product.pricing uses { price, currency }; cart/wishlist may use { amount, currency }.
    const amount = Number(record.amount ?? record.price);
    if (Number.isFinite(amount) && amount > 0) {
      return {
        amount,
        currency: typeof record.currency === 'string' ? record.currency : fallbackCurrency,
      };
    }
    return undefined;
  }
  const amount = Number(value);
  if (Number.isFinite(amount) && amount > 0) {
    return { amount, currency: fallbackCurrency };
  }
  return undefined;
}

export function normalizeWishlistItem(raw: unknown): EnrichedWishlistItem {
  const record = asRecord(raw);
  const productFromId = typeof record.productId === 'object' ? asRecord(record.productId) : {};
  const productFromNest = asRecord(record.product);
  const product = { ...productFromNest, ...productFromId };
  const variantFromId = typeof record.variantId === 'object' ? asRecord(record.variantId) : {};
  const variantFromNest = asRecord(record.variant);
  const variant = { ...variantFromNest, ...variantFromId };

  const currency = String(record.currency ?? product.currency ?? 'LKR');
  const price =
    readMoney(record.price, currency) ??
    readMoney(variant.price, currency) ??
    readMoney(product.pricing, currency) ??
    readMoney(product.price, currency);

  const productId = String(
    product.id ??
      product._id ??
      (typeof record.productId === 'string' || typeof record.productId === 'number'
        ? record.productId
        : ''),
  );
  const variantIdRaw =
    variant.id ??
    variant._id ??
    (typeof record.variantId === 'string' || typeof record.variantId === 'number'
      ? record.variantId
      : undefined);

  return {
    id: String(record.id ?? record._id ?? ''),
    productId,
    variantId: variantIdRaw != null && variantIdRaw !== '' ? String(variantIdRaw) : undefined,
    addedAt:
      typeof record.addedAt === 'string'
        ? record.addedAt
        : record.addedAt instanceof Date
          ? record.addedAt.toISOString()
          : undefined,
    productName:
      typeof record.productName === 'string'
        ? record.productName
        : typeof product.name === 'string'
          ? product.name
          : undefined,
    productSlug:
      typeof record.productSlug === 'string'
        ? record.productSlug
        : typeof product.slug === 'string'
          ? product.slug
          : undefined,
    productStatus:
      typeof record.productStatus === 'string'
        ? record.productStatus
        : typeof product.status === 'string'
          ? product.status
          : undefined,
    variantSku:
      typeof record.variantSku === 'string'
        ? record.variantSku
        : typeof variant.sku === 'string'
          ? variant.sku
          : undefined,
    variantTitle:
      typeof record.variantTitle === 'string'
        ? record.variantTitle
        : typeof variant.title === 'string'
          ? variant.title
          : undefined,
    thumbnailUrl:
      typeof record.thumbnailUrl === 'string'
        ? record.thumbnailUrl
        : typeof product.thumbnailUrl === 'string'
          ? product.thumbnailUrl
          : typeof variant.thumbnailUrl === 'string'
            ? variant.thumbnailUrl
            : undefined,
    price,
  };
}

export function normalizeWishlist(raw: unknown): Wishlist & { items: EnrichedWishlistItem[] } {
  const record = asRecord(raw);
  const items = Array.isArray(record.items) ? record.items.map(normalizeWishlistItem) : [];

  return {
    id: String(record.id ?? record._id ?? ''),
    name: String(record.name ?? 'Wishlist'),
    isDefault: Boolean(record.isDefault),
    shareToken: typeof record.shareToken === 'string' ? record.shareToken : undefined,
    itemCount: typeof record.itemCount === 'number' ? record.itemCount : items.length,
    items,
  };
}

export function getDefaultWishlist(wishlists: Wishlist[]): Wishlist | undefined {
  return wishlists.find((wishlist) => wishlist.isDefault) ?? wishlists[0];
}
