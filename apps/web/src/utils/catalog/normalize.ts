import type {
  Product,
  ProductMedia,
  ProductMoney,
  ProductPricingInsights,
  ProductVariant,
} from '@/services/sdk/products';
import type { Category } from '@/services/sdk/categories';
import { env } from '@/config/env';

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

/**
 * Absolute CDN/R2 URL for uploaded media (`/uploads/...`).
 * Bundled storefront assets (`/catalog/...`) stay site-relative.
 */
function resolveMediaUrl(value: unknown): string | undefined {
  let url: string | undefined;
  if (typeof value === 'string') url = value;
  else {
    const record = asRecord(value);
    url = typeof record.url === 'string' ? record.url : undefined;
  }
  if (!url) return undefined;
  // Rewrite dev-only localhost upload URLs to the real API origin for production.
  const localMatch = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.*)$/i);
  if (localMatch && env.apiOrigin) {
    return `${env.apiOrigin.replace(/\/$/, '')}${localMatch[1]}`;
  }
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Locally-uploaded media (`/uploads/...`) is served by the API, not the web host,
  // so on production (empty CDN) resolve it against the API origin instead of Vercel.
  if (url.startsWith('/uploads/')) {
    const base = env.cdnUrl || env.apiOrigin;
    if (base) return `${base.replace(/\/$/, '')}${url}`;
  }
  return url;
}

export function normalizeProductMedia(raw: unknown): ProductMedia {
  const record = asRecord(raw);
  const variantRaw = record.variantId;
  const variantId =
    typeof variantRaw === 'string' || typeof variantRaw === 'number'
      ? String(variantRaw)
      : variantRaw && typeof variantRaw === 'object'
        ? pickId(asRecord(variantRaw)) || undefined
        : undefined;

  return {
    id: pickId(record),
    url: resolveMediaUrl(record.url) ?? '',
    alt: typeof record.alt === 'string' ? record.alt : undefined,
    thumbnailUrl: resolveMediaUrl(record.thumbnailUrl),
    isPrimary: Boolean(record.isPrimary),
    priority: typeof record.priority === 'number' ? record.priority : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
    variantId: variantId || undefined,
  };
}

export function normalizeProductVariant(raw: unknown): ProductVariant {
  const record = asRecord(raw);
  const currency = String(record.currency ?? 'LKR');
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
    listSeparately: Boolean(record.listSeparately),
    optionValues: asRecord(record.optionValues) as Record<string, string>,
  };
}

export function normalizePricingInsights(raw: unknown): ProductPricingInsights | undefined {
  const record = asRecord(raw);
  if (!Object.keys(record).length) return undefined;
  const currency = String(record.currency ?? 'LKR');
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
  const variants = Array.isArray(record.variants)
    ? record.variants.map(normalizeProductVariant)
    : undefined;
  const defaultVariant =
    variants?.find((variant) => variant.id === String(record.defaultVariantId ?? '')) ??
    variants?.find((variant) => variant.isDefault) ??
    variants?.[0];
  const currency = String(
    pricing.currency ??
      defaultVariant?.price?.currency ??
      defaultVariant?.salePrice?.currency ??
      'LKR',
  );
  const media = Array.isArray(record.media) ? record.media.map(normalizeProductMedia) : undefined;
  const thumbnailUrl =
    resolveMediaUrl(record.thumbnailUrl) ??
    media?.find((item) => item.isPrimary)?.url ??
    media?.[0]?.url;

  const productPrice = toMoney(pricing.price, currency);
  const productSalePrice = toMoney(pricing.salePrice, currency);
  const productCompareAtPrice = toMoney(pricing.compareAtPrice, currency);

  const price =
    productPrice && productPrice.amount > 0
      ? productPrice
      : (defaultVariant?.price ?? productPrice);
  const salePrice = productSalePrice ?? defaultVariant?.salePrice;
  const compareAtPrice = productCompareAtPrice ?? defaultVariant?.compareAtPrice;
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
      insights?.isOnSale ??
      (salePrice != null &&
        price != null &&
        salePrice.amount > 0 &&
        salePrice.amount < price.amount),
    discountPercent: insights?.discountPercent,
    brandId: record.brandId ? String(record.brandId) : undefined,
    brandName: typeof record.brandName === 'string' ? record.brandName : undefined,
    categoryId: record.categoryId ? String(record.categoryId) : undefined,
    categoryIds: Array.isArray(record.categoryIds)
      ? record.categoryIds.map((id) => String(id))
      : undefined,
    subcategoryId: record.subcategoryId ? String(record.subcategoryId) : undefined,
    collectionIds: Array.isArray(record.collectionIds)
      ? record.collectionIds.map((id) => String(id))
      : undefined,
    materialId: record.materialId ? String(record.materialId) : undefined,
    gender: typeof record.gender === 'string' ? record.gender : undefined,
    ageGroup: typeof record.ageGroup === 'string' ? record.ageGroup : undefined,
    occasionIds: Array.isArray(record.occasionIds)
      ? record.occasionIds.map((id) => String(id))
      : undefined,
    tags: Array.isArray(record.tags) ? record.tags.map(String) : undefined,
    isFeatured: Boolean(record.isFeatured),
    isTrending: Boolean(record.isTrending),
    isMoreToLove: Boolean(record.isMoreToLove),
    isNewArrival: Boolean(record.isNewArrival),
    isBestSeller: Boolean(record.isBestSeller),
    isClearance: Boolean(record.isClearance),
    paymentOption:
      record.paymentOption === 'cod' ||
      record.paymentOption === 'prepaid' ||
      record.paymentOption === 'both'
        ? record.paymentOption
        : 'both',
    returnsAvailable: typeof record.returnsAvailable === 'boolean' ? record.returnsAvailable : true,
    returnsCriteria:
      typeof record.returnsCriteria === 'string' ? record.returnsCriteria : undefined,
    warrantyAvailable: Boolean(record.warrantyAvailable),
    warrantyDetails:
      typeof record.warrantyDetails === 'string' ? record.warrantyDetails : undefined,
    averageRating:
      typeof record.averageRating === 'number'
        ? record.averageRating
        : typeof record.rating === 'number'
          ? record.rating
          : undefined,
    reviewCount: typeof record.reviewCount === 'number' ? record.reviewCount : undefined,
    defaultVariantId: record.defaultVariantId ? String(record.defaultVariantId) : undefined,
    variantCount: typeof record.variantCount === 'number' ? record.variantCount : undefined,
    requiresOptionSelection:
      typeof record.requiresOptionSelection === 'boolean'
        ? record.requiresOptionSelection
        : undefined,
    colorId: record.colorId ? String(record.colorId) : undefined,
    colorIds: Array.isArray(record.colorIds) ? record.colorIds.map((id) => String(id)) : undefined,
    sizeIds: Array.isArray(record.sizeIds) ? record.sizeIds.map((id) => String(id)) : undefined,
    thumbnailUrl,
    // The API chooses a hover image from the same listing variant. Do not use
    // an arbitrary second product image here because it may belong to another color.
    hoverImageUrl: resolveMediaUrl(record.hoverImageUrl),
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
  const filterFacetKeys = Array.isArray(record.filterFacetKeys)
    ? record.filterFacetKeys.map((key) => String(key)).filter(Boolean)
    : undefined;
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
    filterFacetKeys,
    seo: asRecord(record.seo),
  };
}
