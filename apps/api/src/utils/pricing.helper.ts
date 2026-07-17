/**
 * Pricing helpers for catalog (no tax engine — margin/profit only).
 */

export interface PriceInput {
  price: number;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
}

export interface EffectivePricing {
  regularPrice: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  effectivePrice: number;
  isOnSale: boolean;
  margin: number | null;
  profit: number | null;
  marginPercent: number | null;
}

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when now is within [saleStartsAt, saleEndsAt] (open-ended allowed). */
export function isSaleActive(
  salePrice: number | null | undefined,
  saleStartsAt?: Date | string | null,
  saleEndsAt?: Date | string | null,
  now = new Date(),
): boolean {
  if (salePrice == null || salePrice < 0) return false;
  const start = toDate(saleStartsAt);
  const end = toDate(saleEndsAt);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function assertSalePriceValid(price: number, salePrice?: number | null): void {
  if (salePrice != null && salePrice > price) {
    throw Object.assign(new Error('Sale price must be less than or equal to regular price'), {
      code: 'SALE_PRICE_INVALID',
    });
  }
}

export function computePricing(input: PriceInput, now = new Date()): EffectivePricing {
  const regularPrice = input.price ?? 0;
  const salePrice = input.salePrice ?? null;
  const compareAtPrice = input.compareAtPrice ?? null;
  const costPrice = input.costPrice ?? null;
  const onSale = isSaleActive(salePrice, input.saleStartsAt, input.saleEndsAt, now);
  const effectivePrice = onSale && salePrice != null ? salePrice : regularPrice;

  let profit: number | null = null;
  let margin: number | null = null;
  let marginPercent: number | null = null;

  if (costPrice != null) {
    profit = Number((effectivePrice - costPrice).toFixed(2));
    margin = profit;
    marginPercent =
      effectivePrice > 0 ? Number(((profit / effectivePrice) * 100).toFixed(2)) : null;
  }

  return {
    regularPrice,
    salePrice,
    compareAtPrice,
    costPrice,
    effectivePrice,
    isOnSale: onSale,
    margin,
    profit,
    marginPercent,
  };
}

/** Build JSON-LD Product schema snippet. */
export function buildProductJsonLd(product: {
  name: string;
  slug: string;
  description?: string | null;
  seo?: { title?: string | null; description?: string | null; canonicalUrl?: string | null } | null;
  pricing?: { price?: number; currency?: string; salePrice?: number | null } | null;
  brandName?: string | null;
  imageUrls?: string[];
  siteUrl?: string;
}) {
  const site = product.siteUrl ?? 'https://example.com';
  const url = product.seo?.canonicalUrl || `${site}/products/${product.slug}`;
  const pricing = computePricing({
    price: product.pricing?.price ?? 0,
    salePrice: product.pricing?.salePrice,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.seo?.title || product.name,
    description: product.seo?.description || product.description || undefined,
    url,
    image: product.imageUrls?.length ? product.imageUrls : undefined,
    brand: product.brandName ? { '@type': 'Brand', name: product.brandName } : undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: product.pricing?.currency ?? 'LKR',
      price: pricing.effectivePrice,
      availability: 'https://schema.org/InStock',
    },
  };
}
