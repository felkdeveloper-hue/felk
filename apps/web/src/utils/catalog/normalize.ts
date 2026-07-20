import type {
  Product,
  ProductMedia,
  ProductMoney,
  ProductPricingInsights,
  ProductVariant,
} from '@/services/sdk/products';
import type { Category } from '@/services/sdk/categories';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function pickId(raw: UnknownRecord): string {
  const id = raw.id ?? raw._id;
  return id ? String(id) : '';
}

function toMoney(amount: unknown, currency: string): ProductMoney | undefined {
  if (amount == null || Number.isNaN(Number(amount))) return undefined;
  return { amount: Number(amount), currency };
}

function resolveMediaUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return typeof record.url === 'string' ? record.url : undefined;
}

export function normalizeProductMedia(raw: unknown): ProductMedia {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    url: resolveMediaUrl(record.url) ?? '',
    alt: typeof record.alt === 'string' ? record.alt : undefined,
    thumbnailUrl: resolveMediaUrl(record.thumbnailUrl),
    isPrimary: Boolean(record.isPrimary),
    priority: typeof record.priority === 'number' ? record.priority : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  };
}

export function normalizeProductVariant(raw: unknown): ProductVariant {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'USD');
  return {
    id: pickId(record),
    productId: String(record.productId ?? ''),
    sku: String(record.sku ?? ''),
    title: typeof record.title === 'string' ? record.title : undefined,
    price: toMoney(record.price, currency),
    salePrice: toMoney(record.salePrice, currency),
    compareAtPrice: toMoney(record.compareAtPrice, currency),
    colorId: record.colorId ? String(record.colorId) : undefined,
    sizeId: record.sizeId ? String(record.sizeId) : undefined,
    stock: typeof record.stock === 'number' ? record.stock : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    thumbnailUrl: resolveMediaUrl(record.thumbnailUrl),
    isDefault: Boolean(record.isDefault),
    optionValues: asRecord(record.optionValues) as Record<string, string>,
  };
}

export function normalizePricingInsights(raw: unknown): ProductPricingInsights | undefined {
  const record = asRecord(raw);
  if (!Object.keys(record).length) return undefined;
  const currency = String(record.currency ?? 'USD');
  return {
    effectivePrice: toMoney(record.effectivePrice, currency),
    isOnSale: Boolean(record.isOnSale),
    discountPercent:
      typeof record.discountPercent === 'number' ? record.discountPercent : undefined,
  };
}

export function normalizeProduct(raw: unknown): Product {
  const record = asRecord(raw);
  const pricing = asRecord(record.pricing);
  const currency = String(pricing.currency ?? 'USD');
  const media = Array.isArray(record.media) ? record.media.map(normalizeProductMedia) : undefined;
  const variants = Array.isArray(record.variants)
    ? record.variants.map(normalizeProductVariant)
    : undefined;
  const thumbnailUrl =
    resolveMediaUrl(record.thumbnailUrl) ??
    media?.find((item) => item.isPrimary)?.url ??
    media?.[0]?.url;

  const price = toMoney(pricing.price, currency);
  const salePrice = toMoney(pricing.salePrice, currency);
  const compareAtPrice = toMoney(pricing.compareAtPrice, currency);
  const insights = normalizePricingInsights(record.pricingInsights);

  return {
    id: pickId(record),
    name: String(record.name ?? ''),
    slug: String(record.slug ?? ''),
    shortDescription:
      typeof record.shortDescription === 'string' ? record.shortDescription : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    status: String(record.status ?? 'draft'),
    visibility: typeof record.visibility === 'string' ? record.visibility : undefined,
    price,
    salePrice,
    compareAtPrice,
    effectivePrice: insights?.effectivePrice ?? salePrice ?? price,
    isOnSale:
      insights?.isOnSale ?? (salePrice != null && price != null && salePrice.amount < price.amount),
    discountPercent: insights?.discountPercent,
    brandId: record.brandId ? String(record.brandId) : undefined,
    brandName: typeof record.brandName === 'string' ? record.brandName : undefined,
    categoryId: record.categoryId ? String(record.categoryId) : undefined,
    subcategoryId: record.subcategoryId ? String(record.subcategoryId) : undefined,
    collectionIds: Array.isArray(record.collectionIds)
      ? record.collectionIds.map((id) => String(id))
      : undefined,
    materialId: record.materialId ? String(record.materialId) : undefined,
    occasionIds: Array.isArray(record.occasionIds)
      ? record.occasionIds.map((id) => String(id))
      : undefined,
    tags: Array.isArray(record.tags) ? record.tags.map(String) : undefined,
    isFeatured: Boolean(record.isFeatured),
    isTrending: Boolean(record.isTrending),
    isNewArrival: Boolean(record.isNewArrival),
    isBestSeller: Boolean(record.isBestSeller),
    isClearance: Boolean(record.isClearance),
    averageRating:
      typeof record.averageRating === 'number'
        ? record.averageRating
        : typeof record.rating === 'number'
          ? record.rating
          : undefined,
    reviewCount: typeof record.reviewCount === 'number' ? record.reviewCount : undefined,
    defaultVariantId: record.defaultVariantId ? String(record.defaultVariantId) : undefined,
    variantCount: typeof record.variantCount === 'number' ? record.variantCount : undefined,
    thumbnailUrl,
    hoverImageUrl: media?.[1]?.url,
    media,
    variants,
    specifications: Array.isArray(record.specifications) ? record.specifications : undefined,
    attributeLinks: Array.isArray(record.attributeLinks) ? record.attributeLinks : undefined,
    seo: asRecord(record.seo),
    sku: typeof record.sku === 'string' ? record.sku : variants?.[0]?.sku,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

export function normalizeCategory(raw: unknown): Category {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    name: String(record.name ?? ''),
    slug: String(record.slug ?? ''),
    parentId: record.parentId ? String(record.parentId) : null,
    description: typeof record.description === 'string' ? record.description : undefined,
    imageUrl: resolveMediaUrl(record.image),
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    depth: typeof record.depth === 'number' ? record.depth : undefined,
    path: typeof record.path === 'string' ? record.path : undefined,
    seo: asRecord(record.seo),
  };
}
