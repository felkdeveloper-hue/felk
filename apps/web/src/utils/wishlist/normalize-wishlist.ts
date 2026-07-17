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

export function normalizeWishlistItem(raw: unknown): EnrichedWishlistItem {
  const record = asRecord(raw);
  const product = asRecord(record.productId);
  const variant = asRecord(record.variantId);

  const priceAmount = Number(variant.price ?? product.pricing ?? 0);
  const currency = String(record.currency ?? 'LKR');

  return {
    id: String(record.id ?? record._id ?? ''),
    productId: String(product.id ?? product._id ?? record.productId ?? ''),
    variantId:
      variant.id || variant._id
        ? String(variant.id ?? variant._id)
        : record.variantId
          ? String(record.variantId)
          : undefined,
    addedAt: typeof record.addedAt === 'string' ? record.addedAt : undefined,
    productName: typeof product.name === 'string' ? product.name : undefined,
    productSlug: typeof product.slug === 'string' ? product.slug : undefined,
    productStatus: typeof product.status === 'string' ? product.status : undefined,
    variantSku: typeof variant.sku === 'string' ? variant.sku : undefined,
    variantTitle: typeof variant.title === 'string' ? variant.title : undefined,
    thumbnailUrl:
      typeof product.thumbnailUrl === 'string'
        ? product.thumbnailUrl
        : typeof variant.thumbnailUrl === 'string'
          ? variant.thumbnailUrl
          : undefined,
    price: priceAmount ? { amount: priceAmount, currency } : undefined,
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
