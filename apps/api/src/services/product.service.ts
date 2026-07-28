import { Types } from 'mongoose';
import {
  ProductModel,
  ProductVariantModel,
  ProductMediaModel,
  ProductRelationshipModel,
  type ProductDocument,
} from '@/models/product.models';
import { BrandModel } from '@/models/master-data.models';
import { InventoryItemModel } from '@/models/inventory.models';
import { productRepository, type ProductListFilters } from '@/repositories/product.repository';
import { writeActivityLog, writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';
import { sanitizeRichText } from '@/utils/sanitize-html';
import { assertSalePriceValid, buildProductJsonLd, computePricing } from '@/utils/pricing.helper';
import { invalidateStorefrontCatalogCache } from '@/utils/simple-cache';
import {
  OFFICIAL_BRAND_NAME,
  OFFICIAL_BRAND_SLUG,
  PRODUCT_AUDIT,
  PRODUCT_STATUS,
} from '@/constants/product';
import { allocateUniqueParentSku, isSkuTaken } from '@/services/sku-allocation.service';
import { env } from '@/config/env';

/** Rewrite localhost upload URLs to the public API host (or path-only). */
function publicMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const localMatch = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.*)$/i);
  if (localMatch) {
    const publicOrigin = (env.API_PUBLIC_URL || env.CDN_BASE_URL || '')
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/$/, '');
    if (publicOrigin && !/localhost|127\.0\.0\.1/i.test(publicOrigin)) {
      return `${publicOrigin}${localMatch[1]}`;
    }
    return localMatch[1];
  }
  return url;
}

function toPlain(doc: { toObject?: () => Record<string, unknown> } | Record<string, unknown>) {
  if (doc && typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    return (doc as { toObject: () => Record<string, unknown> }).toObject();
  }
  return doc as Record<string, unknown>;
}

/** Sum available stock per variant. Variants with no inventory rows get `stock: undefined`. */
async function attachVariantStock<T extends { _id?: unknown }>(
  variants: T[],
): Promise<Array<T & { stock?: number }>> {
  if (!variants.length) return variants;
  const ids = variants.map((v) => v._id).filter(Boolean);
  const items = await InventoryItemModel.find({
    variantId: { $in: ids },
    isDeleted: false,
  })
    .select('variantId available onHand')
    .lean();

  const stockMap = new Map<string, number>();
  for (const item of items) {
    const vid = String(item.variantId);
    const qty = Number(item.available ?? item.onHand ?? 0);
    stockMap.set(vid, (stockMap.get(vid) ?? 0) + qty);
  }

  return variants.map((v) => {
    const id = String(v._id);
    if (!stockMap.has(id)) return { ...v };
    return { ...v, stock: stockMap.get(id) ?? 0 };
  });
}

/**
 * When every tracked variant has 0 available units, mark the product out_of_stock.
 * Restores `active` when stock returns (only if currently out_of_stock).
 */
export async function syncProductStockStatus(productId: string): Promise<void> {
  const product = await ProductModel.findOne({ _id: productId, isDeleted: false })
    .select('status')
    .lean();
  if (!product) return;

  const status = String(product.status ?? '');
  if (
    status !== PRODUCT_STATUS.ACTIVE &&
    status !== PRODUCT_STATUS.OUT_OF_STOCK &&
    status !== PRODUCT_STATUS.SCHEDULED
  ) {
    return;
  }

  const variants = await ProductVariantModel.find({
    productId,
    isDeleted: false,
    status: 'active',
  })
    .select('_id')
    .lean();
  if (!variants.length) return;

  const items = await InventoryItemModel.find({
    variantId: { $in: variants.map((v) => v._id) },
    isDeleted: false,
  })
    .select('variantId available')
    .lean();

  // No inventory rows yet → stock not tracked; leave catalog status alone.
  if (!items.length) return;

  const stockByVariant = new Map<string, number>();
  for (const item of items) {
    const vid = String(item.variantId);
    stockByVariant.set(vid, (stockByVariant.get(vid) ?? 0) + Number(item.available ?? 0));
  }

  // Only consider variants that have inventory rows.
  const tracked = [...stockByVariant.values()];
  if (!tracked.length) return;

  const anyInStock = tracked.some((qty) => qty > 0);
  if (!anyInStock && status !== PRODUCT_STATUS.OUT_OF_STOCK) {
    await ProductModel.updateOne(
      { _id: productId },
      { $set: { status: PRODUCT_STATUS.OUT_OF_STOCK } },
    );
    invalidateStorefrontCatalogCache();
  } else if (anyInStock && status === PRODUCT_STATUS.OUT_OF_STOCK) {
    await ProductModel.updateOne({ _id: productId }, { $set: { status: PRODUCT_STATUS.ACTIVE } });
    invalidateStorefrontCatalogCache();
  }
}

function validatePricing(pricing: {
  price?: number;
  salePrice?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
}) {
  const price = pricing.price ?? 0;
  try {
    assertSalePriceValid(price, pricing.salePrice);
  } catch {
    throw ApiError.badRequest(
      'Sale price must be less than or equal to regular price',
      undefined,
      'SALE_PRICE_INVALID',
    );
  }
  if (pricing.saleStartsAt && pricing.saleEndsAt) {
    const start = new Date(pricing.saleStartsAt);
    const end = new Date(pricing.saleEndsAt);
    if (end < start) {
      throw ApiError.badRequest(
        'Sale end must be after sale start',
        undefined,
        'SALE_WINDOW_INVALID',
      );
    }
  }
}

function validatePublishLifecycle(payload: {
  status?: string;
  publishAt?: Date | string | null;
  archiveAt?: Date | string | null;
}) {
  if (payload.status === PRODUCT_STATUS.SCHEDULED) {
    if (!payload.publishAt) {
      throw ApiError.badRequest(
        'Scheduled products require publishAt',
        undefined,
        'PUBLISH_DATE_REQUIRED',
      );
    }
    if (new Date(payload.publishAt) <= new Date()) {
      throw ApiError.badRequest(
        'publishAt must be in the future for scheduled products',
        undefined,
        'PUBLISH_DATE_INVALID',
      );
    }
  }

  if (payload.publishAt && payload.archiveAt) {
    if (new Date(payload.archiveAt) <= new Date(payload.publishAt)) {
      throw ApiError.badRequest(
        'archiveAt must be after publishAt',
        undefined,
        'ARCHIVE_DATE_INVALID',
      );
    }
  }
}

function withComputedPricing<T extends { pricing?: Record<string, unknown> | null }>(product: T) {
  const pricing = (product.pricing ?? { price: 0 }) as {
    price: number;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    saleStartsAt?: Date | null;
    saleEndsAt?: Date | null;
    currency?: string;
  };
  const saleRaw = pricing.salePrice;
  const sanitized = {
    ...pricing,
    // Persist/legacy rows may store salePrice: 0 — never treat that as a live sale.
    salePrice: saleRaw != null && Number(saleRaw) > 0 ? Number(saleRaw) : null,
  };
  return {
    ...product,
    pricing: sanitized,
    pricingInsights: computePricing(sanitized),
  };
}

function positivePrice(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveListingPricing(
  product: { pricing?: Record<string, unknown> | null },
  variant?: {
    price?: number;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    currency?: string;
  } | null,
) {
  const base = (product.pricing ?? { price: 0, currency: 'LKR' }) as Record<string, unknown>;
  const basePrice = positivePrice(base.price) ?? 0;
  const variantPrice = positivePrice(variant?.price);

  // Prefer a real variant price when the parent product still has price 0.
  if (!variant || (basePrice > 0 && !variantPrice)) {
    return {
      ...base,
      price: basePrice,
      salePrice: positivePrice(base.salePrice),
      compareAtPrice: positivePrice(base.compareAtPrice),
    };
  }

  return {
    ...base,
    price: variantPrice ?? basePrice,
    salePrice: positivePrice(variant.salePrice) ?? positivePrice(base.salePrice),
    compareAtPrice: positivePrice(variant.compareAtPrice) ?? positivePrice(base.compareAtPrice),
    currency: variant.currency ?? base.currency ?? 'LKR',
  };
}

function pickListingVariant<T extends { productId: { toString(): string }; isDefault?: boolean }>(
  variants: T[],
): Map<string, T> {
  const byProduct = new Map<string, T>();
  for (const variant of variants) {
    const productId = variant.productId.toString();
    const existing = byProduct.get(productId);
    if (!existing || variant.isDefault) {
      byProduct.set(productId, variant);
    }
  }
  return byProduct;
}

function listingRequiresOptionSelection(
  variants: Array<{
    colorId?: { toString(): string } | string | null;
    sizeId?: { toString(): string } | string | null;
  }>,
): boolean {
  if (variants.length <= 1) return false;
  const sizeIds = new Set(variants.map((v) => (v.sizeId ? String(v.sizeId) : '')).filter(Boolean));
  const colorIds = new Set(
    variants.map((v) => (v.colorId ? String(v.colorId) : '')).filter(Boolean),
  );
  return sizeIds.size > 1 || colorIds.size > 1 || variants.length > 1;
}

/**
 * Own-listing color cards should show the edited variant title (e.g. sky blue name),
 * not the parent product name (e.g. Hot Pink). Skip auto "Color / Size" labels when
 * a longer descriptive title exists on any size of that color.
 */
function resolveOwnListingDisplayName(
  colorVariants: Array<{ title?: string | null }>,
  fallbackProductName: string,
): string {
  const titles = colorVariants
    .map((variant) => variant.title?.trim())
    .filter((title): title is string => Boolean(title));
  if (!titles.length) return fallbackProductName;

  const isAutoColorSizeLabel = (title: string) =>
    /^[^/]+ \/ [^/]+$/.test(title) && title.length <= 48;

  const descriptive = titles.filter((title) => !isAutoColorSizeLabel(title));
  const pool = descriptive.length ? descriptive : titles;
  return [...pool].sort((a, b) => b.length - a.length)[0] ?? fallbackProductName;
}

export class ProductService {
  async list(options: ProductListFilters) {
    const result = await productRepository.listCatalog(options);
    if (!result.data.length) return result;

    const productIds = result.data.map((product) => product._id);
    const brandIds = result.data
      .map((product) => product.brandId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const [variants, media, brands] = await Promise.all([
      ProductVariantModel.find({
        productId: { $in: productIds },
        isDeleted: false,
        status: 'active',
      })
        .select(
          'productId isDefault listSeparately displayOrder price salePrice compareAtPrice currency sku thumbnailUrl colorId sizeId title',
        )
        .sort({ isDefault: -1, displayOrder: 1, createdAt: 1 })
        .lean(),
      // Cap at primary + hover per color/variant group in Mongo (cards never need more).
      ProductMediaModel.aggregate<{
        _id: Types.ObjectId;
        productId: Types.ObjectId;
        variantId?: Types.ObjectId | null;
        url?: string;
        thumbnailUrl?: string;
        isPrimary?: boolean;
        priority?: number;
      }>([
        {
          $match: {
            productId: { $in: productIds },
            isDeleted: false,
          },
        },
        { $sort: { isPrimary: -1, priority: 1 } },
        {
          $group: {
            _id: {
              productId: '$productId',
              variantId: { $ifNull: ['$variantId', null] },
            },
            items: {
              $push: {
                _id: '$_id',
                productId: '$productId',
                variantId: '$variantId',
                url: '$url',
                thumbnailUrl: '$thumbnailUrl',
                isPrimary: '$isPrimary',
                priority: '$priority',
              },
            },
          },
        },
        { $project: { items: { $slice: ['$items', 2] } } },
        { $unwind: '$items' },
        { $replaceRoot: { newRoot: '$items' } },
      ]),
      BrandModel.find({ _id: { $in: brandIds }, isDeleted: false })
        .select('name')
        .lean(),
    ]);

    const variantIds = variants.map((v) => v._id);
    const inventoryRows =
      variantIds.length > 0
        ? await InventoryItemModel.find({
            variantId: { $in: variantIds },
            isDeleted: false,
          })
            .select('variantId available')
            .lean()
        : [];
    const stockByVariantId = new Map<string, number>();
    for (const row of inventoryRows) {
      const vid = String(row.variantId);
      stockByVariantId.set(vid, (stockByVariantId.get(vid) ?? 0) + Number(row.available ?? 0));
    }
    const trackedVariantIds = new Set(stockByVariantId.keys());

    const listingVariantByProduct = pickListingVariant(variants);
    const variantsByProduct = new Map<string, typeof variants>();
    for (const variant of variants) {
      const key = variant.productId.toString();
      const bucket = variantsByProduct.get(key);
      if (bucket) bucket.push(variant);
      else variantsByProduct.set(key, [variant]);
    }
    const mediaByProduct = new Map<string, typeof media>();
    for (const item of media) {
      const productKey = item.productId.toString();
      const bucket = mediaByProduct.get(productKey);
      if (bucket) bucket.push(item);
      else mediaByProduct.set(productKey, [item]);
    }
    const brandById = new Map(brands.map((brand) => [brand._id.toString(), brand.name]));

    const pickThumbnail = (
      productMedia: typeof media,
      listingVariant?: (typeof variants)[number],
    ) => {
      const listingId = listingVariant?._id?.toString();
      const forVariant = listingId
        ? productMedia.filter((item) => item.variantId?.toString() === listingId)
        : [];
      const productLevel = productMedia.filter((item) => !item.variantId);
      // Prefer listing-variant media, then product-level (never another color).
      const pool = forVariant.length ? forVariant : productLevel;
      const primary = pool.find((item) => item.isPrimary) ?? pool[0];
      const hover = primary
        ? pool.find((item) => item._id.toString() !== primary._id.toString())
        : undefined;
      const primaryUrl = publicMediaUrl(
        primary?.thumbnailUrl ?? primary?.url ?? listingVariant?.thumbnailUrl,
      );
      const hoverUrl = publicMediaUrl(hover?.thumbnailUrl ?? hover?.url);
      return {
        thumbnailUrl: primaryUrl,
        hoverImageUrl: hoverUrl && hoverUrl !== primaryUrl ? hoverUrl : undefined,
      };
    };

    return {
      ...result,
      data: result.data.flatMap((product) => {
        try {
          const id = product._id.toString();
          const listingVariant = listingVariantByProduct.get(id);
          const productVariants = variantsByProduct.get(id) ?? [];
          const productMedia = mediaByProduct.get(id) ?? [];
          const listingPricing = resolveListingPricing(
            product as unknown as { pricing?: Record<string, unknown> | null },
            listingVariant,
          );

          const thumbs = pickThumbnail(productMedia, listingVariant);

          const buildCard = (
            cardListingVariant: (typeof variants)[number] | undefined,
            cardPricing: ReturnType<typeof resolveListingPricing>,
            cardThumbs: { thumbnailUrl?: string; hoverImageUrl?: string | undefined },
            displayName?: string,
          ) => {
            const cardComputed = withComputedPricing({
              ...(product as unknown as Record<string, unknown>),
              pricing: cardPricing,
            });
            const colorIds = [
              ...new Set(
                productVariants
                  .map((variant) => (variant.colorId ? String(variant.colorId) : ''))
                  .filter(Boolean),
              ),
            ];
            const sizeIds = [
              ...new Set(
                productVariants
                  .map((variant) => (variant.sizeId ? String(variant.sizeId) : ''))
                  .filter(Boolean),
              ),
            ];
            const occasionIds = Array.isArray((product as { occasionIds?: unknown }).occasionIds)
              ? ((product as { occasionIds: unknown[] }).occasionIds ?? []).map((id) => String(id))
              : [];
            const materialId = (product as { materialId?: Types.ObjectId | null }).materialId
              ? String((product as { materialId: Types.ObjectId }).materialId)
              : undefined;

            // Product is out of stock when every variant that has inventory is at 0,
            // or the persisted status is already out_of_stock.
            const stockScope =
              cardListingVariant?.listSeparately && cardListingVariant.colorId
                ? productVariants.filter(
                    (v) => v.colorId && String(v.colorId) === String(cardListingVariant.colorId),
                  )
                : productVariants;
            const trackedStocks = stockScope
              .map((v) => String(v._id))
              .filter((vid) => trackedVariantIds.has(vid))
              .map((vid) => stockByVariantId.get(vid) ?? 0);
            const stockInStock =
              trackedStocks.length === 0 ? true : trackedStocks.some((qty) => qty > 0);
            const inStock =
              !cardListingVariant?.listSeparately && product.status === PRODUCT_STATUS.OUT_OF_STOCK
                ? false
                : stockInStock;

            return {
              _id: product._id,
              id,
              // Own-listing colors can override the catalog title with a variant name.
              name: displayName?.trim() || product.name,
              slug: product.slug,
              shortDescription: product.shortDescription,
              status: inStock ? product.status : PRODUCT_STATUS.OUT_OF_STOCK,
              inStock,
              visibility: product.visibility,
              pricing: cardComputed.pricing,
              pricingInsights: cardComputed.pricingInsights,
              brandId: product.brandId,
              brandName: product.brandId ? brandById.get(product.brandId.toString()) : undefined,
              categoryId: product.categoryId,
              categoryIds: product.categoryIds,
              gender: product.gender,
              materialId,
              occasionIds,
              colorId: cardListingVariant?.colorId ? String(cardListingVariant.colorId) : undefined,
              colorIds,
              sizeIds,
              isFeatured: product.isFeatured,
              isTrending: product.isTrending,
              isMoreToLove: Boolean(
                (product as { isMoreToLove?: boolean }).isMoreToLove ?? product.isTrending,
              ),
              isNewArrival: product.isNewArrival,
              isBestSeller: product.isBestSeller,
              isClearance: product.isClearance,
              averageRating: product.averageRating ?? 0,
              reviewCount: product.reviewCount ?? 0,
              defaultVariantId: cardListingVariant?._id
                ? String(cardListingVariant._id)
                : product.defaultVariantId
                  ? String(product.defaultVariantId)
                  : undefined,
              variantCount: productVariants.length || product.variantCount || 0,
              requiresOptionSelection: listingRequiresOptionSelection(productVariants),
              sku: product.sku ?? cardListingVariant?.sku,
              thumbnailUrl: cardThumbs.thumbnailUrl,
              hoverImageUrl: cardThumbs.hoverImageUrl,
              createdAt: product.createdAt,
              updatedAt: product.updatedAt,
            };
          };

          const filterColorId = options.colorId ? String(options.colorId) : undefined;

          // When filtering by color, emit a single card using that color's image/pricing.
          if (filterColorId) {
            const colorVariants = productVariants.filter(
              (variant) => variant.colorId && String(variant.colorId) === filterColorId,
            );
            if (!colorVariants.length) return [];
            const colorRepresentative =
              colorVariants.find((variant) => variant.listSeparately) ??
              colorVariants.find((variant) => variant.isDefault) ??
              colorVariants[0];
            const colorPricing = resolveListingPricing(
              product as unknown as { pricing?: Record<string, unknown> | null },
              colorRepresentative,
            );
            const colorThumbs = pickThumbnail(productMedia, colorRepresentative);
            const ownListingName = resolveOwnListingDisplayName(colorVariants, product.name);
            return [
              buildCard(
                colorRepresentative,
                colorPricing,
                colorThumbs,
                colorRepresentative?.listSeparately ? ownListingName : undefined,
              ),
            ];
          }

          // Default listing keeps the product name (admin "Product Name" field).
          const cards = [buildCard(listingVariant, listingPricing, thumbs)];

          // Extra catalog cards for colors marked "show as own listing"
          const defaultColorKey = listingVariant?.colorId
            ? String(listingVariant.colorId)
            : '__none__';
          const seenColors = new Set<string>([defaultColorKey]);
          for (const variant of productVariants) {
            if (!variant.listSeparately) continue;
            const colorKey = variant.colorId ? String(variant.colorId) : `v:${variant._id}`;
            if (seenColors.has(colorKey)) continue;
            seenColors.add(colorKey);
            const colorVariants = productVariants.filter(
              (v) => (v.colorId ? String(v.colorId) : `v:${v._id}`) === colorKey,
            );
            // Prefer the first variant of this color marked own-listing (already sorted)
            const colorRepresentative =
              colorVariants.find((v) => v.listSeparately) ?? colorVariants[0] ?? variant;
            const extraPricing = resolveListingPricing(
              product as unknown as { pricing?: Record<string, unknown> | null },
              colorRepresentative,
            );
            const extraThumbs = pickThumbnail(productMedia, colorRepresentative);
            const ownListingName = resolveOwnListingDisplayName(colorVariants, product.name);
            cards.push(buildCard(colorRepresentative, extraPricing, extraThumbs, ownListingName));
          }

          return cards;
        } catch {
          // Skip malformed rows so one bad product cannot 500 the whole rail.
          return [];
        }
      }),
    };
  }

  async getById(id: string, includeDeleted = false) {
    const doc = await productRepository.findById(id, includeDeleted);
    if (!doc) throw ApiError.notFound('Product not found');
    return this.hydrateProductDetail(doc as never, id);
  }

  async getBySlug(slug: string, includeDeleted = false) {
    const doc = await productRepository.findBySlug(slug, includeDeleted);
    if (!doc) throw ApiError.notFound('Product not found');
    return this.hydrateProductDetail(doc as never, String((doc as { _id: unknown })._id));
  }

  /**
   * Shared PDP enrichment: one parallel batch for variants/media/relationships.
   * Only creates a default variant when the product has none (avoids an extra find on every hit).
   */
  private async hydrateProductDetail(
    doc: {
      defaultVariantId?: unknown;
      pricing?: {
        price?: number;
        salePrice?: number | null;
        compareAtPrice?: number | null;
        currency?: string;
      } | null;
      name?: string;
      brandId?: unknown;
    },
    id: string,
  ) {
    const plain = toPlain(doc) as Record<string, unknown>;
    const brandId = plain.brandId ? String(plain.brandId) : undefined;

    const [variants, media, relationships, brand] = await Promise.all([
      ProductVariantModel.find({ productId: id, isDeleted: false })
        .sort({ displayOrder: 1 })
        .lean(),
      ProductMediaModel.find({ productId: id, isDeleted: false }).sort({ priority: 1 }).lean(),
      ProductRelationshipModel.find({ productId: id, isDeleted: false })
        .sort({ sortOrder: 1 })
        .lean(),
      brandId ? BrandModel.findById(brandId).select('name').lean() : Promise.resolve(null),
    ]);

    // Do not auto-create empty "No color" variants on read — that pollutes the
    // admin editor right after "Create product". Default variants are created
    // only on publish when the product still has none (cart needs a SKU).
    if (!plain.defaultVariantId && variants.length) {
      plain.defaultVariantId = variants[0]?._id;
      void ProductModel.updateOne(
        { _id: id },
        { $set: { defaultVariantId: variants[0]?._id } },
      ).exec();
    }

    const brandName = brand?.name ? String(brand.name) : undefined;

    const listingVariant =
      variants.find((v) => String(v._id) === String(plain.defaultVariantId ?? '')) ??
      variants.find((v) => v.isDefault) ??
      variants[0];
    const listingPricing = resolveListingPricing(
      plain as { pricing?: Record<string, unknown> | null },
      listingVariant
        ? {
            price: listingVariant.price,
            salePrice: listingVariant.salePrice,
            compareAtPrice: listingVariant.compareAtPrice,
            currency: listingVariant.currency,
          }
        : null,
    );

    const variantsWithStock = await attachVariantStock(variants);

    const trackedStocks = variantsWithStock
      .map((v) => v.stock)
      .filter((s): s is number => typeof s === 'number');
    const inStock = trackedStocks.length === 0 ? true : trackedStocks.some((s) => s > 0);

    return {
      ...withComputedPricing({ ...plain, pricing: listingPricing }),
      brandName,
      inStock,
      variants: variantsWithStock,
      media,
      relationships,
    };
  }

  /**
   * Simple products (price only, no size/color options) still need a default variant
   * for cart/checkout. Create one automatically when missing.
   */
  async ensureDefaultVariant(
    productId: string,
    actor: ActorMeta = {},
    preloadedProduct?: {
      defaultVariantId?: unknown;
      pricing?: {
        price?: number;
        salePrice?: number | null;
        compareAtPrice?: number | null;
        currency?: string;
      } | null;
      name?: string;
    } | null,
  ) {
    const product = preloadedProduct ?? (await productRepository.findById(productId));
    if (!product) return null;

    const existing = await ProductVariantModel.findOne({
      productId,
      isDeleted: false,
    }).sort({ isDefault: -1, displayOrder: 1, createdAt: 1 });

    if (existing) {
      if (!product.defaultVariantId) {
        await ProductModel.updateOne(
          { _id: productId },
          { $set: { defaultVariantId: existing._id } },
        );
      }
      return existing;
    }

    const price = Number(product.pricing?.price ?? 0);
    if (price <= 0) return null;

    const { productVariantService } = await import('@/services/product-variant.service');
    return productVariantService.create(
      productId,
      {
        title: product.name,
        price,
        salePrice: product.pricing?.salePrice ?? null,
        compareAtPrice: product.pricing?.compareAtPrice ?? null,
        currency: product.pricing?.currency ?? 'LKR',
        isDefault: true,
        status: 'active',
      },
      actor,
    );
  }

  async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const name = String(payload.name ?? '');
    let slug = payload.slug ? String(payload.slug) : slugify(name);

    // Unique index covers soft-deleted rows too — always check including deleted.
    const existing = await productRepository.findBySlug(slug, true);
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const sku = payload.sku
      ? String(payload.sku).trim().toUpperCase()
      : await allocateUniqueParentSku();
    if (payload.sku && (await isSkuTaken(sku))) {
      throw ApiError.conflict('SKU already exists', undefined, 'SKU_EXISTS');
    }

    const pricing = (payload.pricing as Record<string, unknown>) ?? {
      price: payload.price ?? 0,
      salePrice: payload.salePrice ?? null,
      compareAtPrice: payload.compareAtPrice ?? null,
      costPrice: payload.costPrice ?? null,
      currency: payload.currency ?? 'LKR',
      taxClass: payload.taxClass ?? null,
      saleStartsAt: payload.saleStartsAt ?? null,
      saleEndsAt: payload.saleEndsAt ?? null,
    };

    validatePricing(pricing as never);
    validatePublishLifecycle({
      status: payload.status as string | undefined,
      publishAt: payload.publishAt as string | null | undefined,
      archiveAt: payload.archiveAt as string | null | undefined,
    });

    const seo = {
      ...((payload.seo as Record<string, unknown>) ?? {}),
    };

    if (!seo.schemaJson) {
      seo.schemaJson = buildProductJsonLd({
        name,
        slug,
        description: payload.shortDescription as string | undefined,
        seo: seo as never,
        pricing: pricing as never,
      });
    }

    let brandId = payload.brandId ?? null;
    if (!brandId) {
      const official = await BrandModel.findOne({
        isDeleted: false,
        $or: [{ slug: OFFICIAL_BRAND_SLUG }, { name: OFFICIAL_BRAND_NAME }],
      }).select('_id');
      brandId = official?._id ?? null;
    }

    const doc = await ProductModel.create({
      name,
      slug,
      sku,
      shortDescription: payload.shortDescription ?? null,
      description: sanitizeRichText(payload.description as string | undefined) ?? null,
      brandId,
      categoryId: payload.categoryId ?? null,
      categoryIds: Array.isArray(payload.categoryIds)
        ? payload.categoryIds
        : payload.categoryId
          ? [payload.categoryId]
          : [],
      subcategoryId: payload.subcategoryId ?? null,
      collectionIds: payload.collectionIds ?? [],
      seasonId: payload.seasonId ?? null,
      materialId: payload.materialId ?? null,
      gender: payload.gender ?? null,
      ageGroup: payload.ageGroup ?? null,
      occasionIds: payload.occasionIds ?? [],
      tags: payload.tags ?? [],
      paymentOption: (payload.paymentOption as string) ?? 'both',
      returnsAvailable:
        payload.returnsAvailable === undefined ? true : Boolean(payload.returnsAvailable),
      returnsCriteria: (payload.returnsCriteria as string | null | undefined) ?? null,
      warrantyAvailable: Boolean(payload.warrantyAvailable),
      warrantyDetails: (payload.warrantyDetails as string | null | undefined) ?? null,
      isFeatured: Boolean(payload.isFeatured),
      isTrending: Boolean(payload.isTrending),
      isMoreToLove: Boolean(payload.isMoreToLove ?? payload.isTrending),
      isNewArrival: Boolean(payload.isNewArrival),
      isBestSeller: Boolean(payload.isBestSeller),
      isClearance: Boolean(payload.isClearance),
      status: payload.status ?? PRODUCT_STATUS.DRAFT,
      visibility: payload.visibility ?? 'public',
      publishAt: payload.publishAt ?? null,
      archiveAt: payload.archiveAt ?? null,
      seo,
      searchKeywords: payload.searchKeywords ?? [],
      specifications: payload.specifications ?? [],
      attributeLinks: payload.attributeLinks ?? [],
      pricing,
      variantCount: 0,
    });

    await writeAuditLog({
      action: PRODUCT_AUDIT.CREATED,
      resourceType: 'products',
      resourceId: doc._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      requestId: actor.requestId,
      after: toPlain(doc),
    });
    await writeActivityLog({
      summary: `Created product ${doc.name}`,
      module: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { id: doc._id.toString() },
    });

    invalidateStorefrontCatalogCache();
    return doc;
  }

  async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await productRepository.findById(id);
    if (!before) throw ApiError.notFound('Product not found');

    if (payload.slug && payload.slug !== before.slug) {
      const existing = await productRepository.findBySlug(String(payload.slug));
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict('Slug already exists', undefined, 'SLUG_EXISTS');
      }
    }

    if (payload.sku) {
      const sku = String(payload.sku).trim().toUpperCase();
      payload.sku = sku;
      if (sku !== before.sku && (await isSkuTaken(sku, { excludeProductId: id }))) {
        throw ApiError.conflict('SKU already exists', undefined, 'SKU_EXISTS');
      }
    } else if (!before.sku) {
      payload.sku = await allocateUniqueParentSku();
    }

    if (payload.pricing) {
      validatePricing(payload.pricing as never);
    }

    validatePublishLifecycle({
      status: (payload.status as string | undefined) ?? before.status,
      publishAt:
        (payload.publishAt as string | null | undefined) ??
        (before.publishAt as Date | null | undefined),
      archiveAt:
        (payload.archiveAt as string | null | undefined) ??
        (before.archiveAt as Date | null | undefined),
    });

    if (payload.description !== undefined) {
      payload.description = sanitizeRichText(payload.description as string) ?? null;
    }

    const priceChanged =
      payload.pricing && JSON.stringify(payload.pricing) !== JSON.stringify(before.pricing);

    const seoChanged = payload.seo && JSON.stringify(payload.seo) !== JSON.stringify(before.seo);

    const doc = await productRepository.updateById(id, {
      $set: { ...payload, version: (before.version ?? 1) + 1 },
    });

    // Intentionally do NOT auto-create a default variant on save — that left
    // empty "No color / —" stubs in the admin editor. Publish still ensures one
    // when the product has no variants at all.

    await writeAuditLog({
      action: PRODUCT_AUDIT.UPDATED,
      resourceType: 'products',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      after: toPlain(doc),
    });

    if (priceChanged) {
      const defaultVariant = await ProductVariantModel.findOne({
        productId: id,
        isDeleted: false,
      }).sort({ isDefault: -1, displayOrder: 1, createdAt: 1 });
      const pricing =
        (doc as { pricing?: Record<string, unknown> } | null)?.pricing ?? payload.pricing;
      if (defaultVariant && pricing && typeof pricing === 'object') {
        await ProductVariantModel.updateOne(
          { _id: defaultVariant._id },
          {
            $set: {
              price: Number((pricing as { price?: number }).price ?? defaultVariant.price),
              salePrice: (pricing as { salePrice?: number | null }).salePrice ?? null,
              compareAtPrice:
                (pricing as { compareAtPrice?: number | null }).compareAtPrice ?? null,
              currency: (pricing as { currency?: string }).currency ?? defaultVariant.currency,
            },
          },
        );
      }

      await writeAuditLog({
        action: PRODUCT_AUDIT.PRICE_CHANGED,
        resourceType: 'products',
        resourceId: id,
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        before: { pricing: before.pricing },
        after: { pricing: (doc as { pricing?: unknown } | null)?.pricing },
      });
    }

    if (seoChanged) {
      await writeAuditLog({
        action: PRODUCT_AUDIT.SEO_CHANGED,
        resourceType: 'products',
        resourceId: id,
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        before: { seo: before.seo },
        after: { seo: doc.seo },
      });
    }

    await writeActivityLog({
      summary: `Updated product ${doc.name}`,
      module: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { id },
    });

    invalidateStorefrontCatalogCache();
    return doc;
  }

  async publish(id: string, actor: ActorMeta, publishAt?: Date | string | null) {
    const before = await productRepository.findById(id);
    if (!before) throw ApiError.notFound('Product not found');

    const when = publishAt ? new Date(publishAt) : new Date();
    const status = when > new Date() ? PRODUCT_STATUS.SCHEDULED : PRODUCT_STATUS.ACTIVE;

    if (status === PRODUCT_STATUS.SCHEDULED && when <= new Date()) {
      throw ApiError.badRequest('publishAt must be in the future for schedule');
    }

    await this.ensureDefaultVariant(id, actor);

    const doc = await productRepository.updateById(id, {
      $set: { status, publishAt: when, visibility: 'public' },
    });

    await writeAuditLog({
      action: PRODUCT_AUDIT.PUBLISHED,
      resourceType: 'products',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      after: toPlain(doc),
    });

    invalidateStorefrontCatalogCache();
    return doc;
  }

  async remove(id: string, actor: ActorMeta) {
    const before = await productRepository.findById(id);
    if (!before) throw ApiError.notFound('Product not found');
    const doc = await productRepository.softDelete(id);

    await writeAuditLog({
      action: PRODUCT_AUDIT.DELETED,
      resourceType: 'products',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
    });

    invalidateStorefrontCatalogCache();
    return doc;
  }

  async restore(id: string, actor: ActorMeta) {
    const doc = await productRepository.restore(id);
    await writeAuditLog({
      action: 'products.restored',
      resourceType: 'products',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(doc),
    });
    return doc;
  }

  async duplicate(id: string, actor: ActorMeta) {
    const source = await this.getById(id);
    const base = source as Record<string, unknown>;
    const name = `${String(base.name)} (Copy)`;
    const created = await this.create(
      {
        name,
        shortDescription: base.shortDescription,
        description: base.description,
        brandId: base.brandId,
        categoryId: base.categoryId,
        subcategoryId: base.subcategoryId,
        collectionIds: base.collectionIds,
        seasonId: base.seasonId,
        materialId: base.materialId,
        gender: base.gender,
        ageGroup: base.ageGroup,
        occasionIds: base.occasionIds,
        tags: base.tags,
        status: PRODUCT_STATUS.DRAFT,
        visibility: base.visibility,
        seo: base.seo,
        searchKeywords: base.searchKeywords,
        specifications: base.specifications,
        attributeLinks: base.attributeLinks,
        pricing: base.pricing,
        isFeatured: false,
        isTrending: false,
        isNewArrival: false,
        isBestSeller: false,
        isClearance: Boolean(base.isClearance),
      },
      actor,
    );

    const variants = (base.variants as Array<Record<string, unknown>>) ?? [];
    for (const [index, variant] of variants.entries()) {
      await ProductVariantModel.create({
        productId: created._id,
        sku: `${String(variant.sku)}-COPY-${Date.now().toString(36)}-${index}`,
        barcode: null,
        title: variant.title,
        colorId: variant.colorId ?? null,
        sizeId: variant.sizeId ?? null,
        optionValues: variant.optionValues ?? {},
        weightGrams: variant.weightGrams ?? null,
        dimensions: variant.dimensions ?? null,
        price: variant.price,
        salePrice: variant.salePrice ?? null,
        costPrice: variant.costPrice ?? null,
        compareAtPrice: variant.compareAtPrice ?? null,
        taxClass: variant.taxClass ?? null,
        currency: variant.currency ?? 'LKR',
        saleStartsAt: variant.saleStartsAt ?? null,
        saleEndsAt: variant.saleEndsAt ?? null,
        status: variant.status ?? 'active',
        displayOrder: variant.displayOrder ?? index,
        isDefault: Boolean(variant.isDefault),
        thumbnailUrl: variant.thumbnailUrl ?? null,
      });
    }

    await ProductModel.updateOne({ _id: created._id }, { $set: { variantCount: variants.length } });

    await writeAuditLog({
      action: PRODUCT_AUDIT.DUPLICATED,
      resourceType: 'products',
      resourceId: created._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { sourceId: id },
    });

    return this.getById(created._id.toString());
  }

  async bulkCreate(items: Record<string, unknown>[], actor: ActorMeta) {
    const created = [];
    for (const item of items) {
      created.push(await this.create(item, actor));
    }
    return { count: created.length, items: created };
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: Record<string, unknown> }>,
    actor: ActorMeta,
  ) {
    const items = [];
    for (const row of updates) {
      items.push(await this.update(row.id, row.data, actor));
    }
    return { count: items.length, items };
  }

  async bulkDelete(ids: string[], actor: ActorMeta) {
    const count = await productRepository.bulkSoftDelete(ids);
    await writeAuditLog({
      action: 'products.bulk_delete',
      resourceType: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { ids, count },
    });
    return { count };
  }

  async bulkStatus(ids: string[], status: string, actor: ActorMeta) {
    if (!Object.values(PRODUCT_STATUS).includes(status as never)) {
      throw ApiError.badRequest('Invalid product status');
    }
    const count = await productRepository.bulkUpdateStatus(ids, status);
    await writeAuditLog({
      action: 'products.bulk_status',
      resourceType: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { ids, status, count },
    });
    return { count };
  }

  /** Placeholder for CSV/Excel import pipeline (Phase later). */
  async importPlaceholder(actor: ActorMeta) {
    await writeAuditLog({
      action: 'products.import_placeholder',
      resourceType: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { status: 'not_implemented' },
    });
    return {
      accepted: false,
      message:
        'Product import pipeline is stubbed. Upload CSV/XLSX jobs will be wired in a later phase.',
      supportedFormats: ['csv', 'xlsx'],
    };
  }

  async exportAll(options: ProductListFilters) {
    return productRepository.listCatalog({ ...options, page: 1, limit: 100 });
  }

  async refreshVariantCount(productId: string) {
    const count = await ProductVariantModel.countDocuments({
      productId,
      isDeleted: false,
    });
    await ProductModel.updateOne({ _id: productId }, { $set: { variantCount: count } });
    return count;
  }
}

export const productService = new ProductService();

export type { ProductDocument };
export { Types };
