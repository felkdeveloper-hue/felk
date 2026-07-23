import { Types } from 'mongoose';
import {
  ProductModel,
  ProductVariantModel,
  ProductMediaModel,
  ProductRelationshipModel,
  type ProductDocument,
} from '@/models/product.models';
import { BrandModel } from '@/models/master-data.models';
import { productRepository, type ProductListFilters } from '@/repositories/product.repository';
import { writeActivityLog, writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';
import { sanitizeRichText } from '@/utils/sanitize-html';
import { assertSalePriceValid, buildProductJsonLd, computePricing } from '@/utils/pricing.helper';
import { PRODUCT_AUDIT, PRODUCT_STATUS } from '@/constants/product';
import { allocateUniqueParentSku, isSkuTaken } from '@/services/sku-allocation.service';

function toPlain(doc: { toObject?: () => Record<string, unknown> } | Record<string, unknown>) {
  if (doc && typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    return (doc as { toObject: () => Record<string, unknown> }).toObject();
  }
  return doc as Record<string, unknown>;
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
  return {
    ...product,
    pricingInsights: computePricing(pricing),
  };
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
  const basePrice = Number(base.price ?? 0);
  if (!variant || basePrice > 0) {
    return base;
  }

  return {
    ...base,
    price: variant.price ?? basePrice,
    salePrice: variant.salePrice ?? base.salePrice ?? null,
    compareAtPrice: variant.compareAtPrice ?? base.compareAtPrice ?? null,
    currency: variant.currency ?? base.currency ?? 'LKR',
  };
}

function pickListingVariant(
  variants: Array<{
    _id?: { toString(): string };
    productId: { toString(): string };
    isDefault?: boolean;
    displayOrder?: number;
    price?: number;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    currency?: string;
    sku?: string;
    thumbnailUrl?: string | null;
  }>,
) {
  const byProduct = new Map<string, (typeof variants)[number]>();
  for (const variant of variants) {
    const productId = variant.productId.toString();
    const existing = byProduct.get(productId);
    if (!existing || variant.isDefault) {
      byProduct.set(productId, variant);
    }
  }
  return byProduct;
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
          'productId isDefault displayOrder price salePrice compareAtPrice currency sku thumbnailUrl',
        )
        .sort({ isDefault: -1, displayOrder: 1, createdAt: 1 })
        .lean(),
      ProductMediaModel.find({
        productId: { $in: productIds },
        isDeleted: false,
      })
        .select('productId url thumbnailUrl isPrimary priority')
        .sort({ priority: 1 })
        .lean(),
      BrandModel.find({ _id: { $in: brandIds }, isDeleted: false })
        .select('name')
        .lean(),
    ]);

    const listingVariantByProduct = pickListingVariant(variants);
    const mediaByProduct = new Map<string, typeof media>();
    for (const item of media) {
      const key = item.productId.toString();
      mediaByProduct.set(key, [...(mediaByProduct.get(key) ?? []), item]);
    }
    const brandById = new Map(brands.map((brand) => [brand._id.toString(), brand.name]));

    return {
      ...result,
      data: result.data.flatMap((product) => {
        try {
          const id = product._id.toString();
          const listingVariant = listingVariantByProduct.get(id);
          const productMedia = mediaByProduct.get(id) ?? [];
          const primary = productMedia.find((item) => item.isPrimary) ?? productMedia[0];
          const hover = primary
            ? productMedia.find((item) => item._id.toString() !== primary._id.toString())
            : productMedia[1];
          const listingPricing = resolveListingPricing(
            product as unknown as { pricing?: Record<string, unknown> | null },
            listingVariant,
          );

          const computed = withComputedPricing({
            ...(product as unknown as Record<string, unknown>),
            pricing: listingPricing,
          });

          // Slim card DTO — omit description/seo/specifications/full media arrays.
          return [
            {
              _id: product._id,
              id,
              name: product.name,
              slug: product.slug,
              shortDescription: product.shortDescription,
              status: product.status,
              visibility: product.visibility,
              pricing: computed.pricing,
              pricingInsights: computed.pricingInsights,
              brandId: product.brandId,
              brandName: product.brandId ? brandById.get(product.brandId.toString()) : undefined,
              categoryId: product.categoryId,
              gender: product.gender,
              isFeatured: product.isFeatured,
              isTrending: product.isTrending,
              isNewArrival: product.isNewArrival,
              isBestSeller: product.isBestSeller,
              isClearance: product.isClearance,
              averageRating: product.averageRating ?? 0,
              reviewCount: product.reviewCount ?? 0,
              defaultVariantId: product.defaultVariantId ?? listingVariant?._id,
              variantCount: product.variantCount,
              sku: product.sku ?? listingVariant?.sku,
              thumbnailUrl: primary?.thumbnailUrl ?? primary?.url ?? listingVariant?.thumbnailUrl,
              hoverImageUrl: hover?.url ?? hover?.thumbnailUrl,
              createdAt: product.createdAt,
              updatedAt: product.updatedAt,
            },
          ];
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

    await this.ensureDefaultVariant(id);

    const [variants, media, relationships, refreshed] = await Promise.all([
      ProductVariantModel.find({ productId: id, isDeleted: false }).sort({ displayOrder: 1 }),
      ProductMediaModel.find({ productId: id, isDeleted: false }).sort({ priority: 1 }),
      ProductRelationshipModel.find({ productId: id, isDeleted: false }).sort({ sortOrder: 1 }),
      productRepository.findById(id, includeDeleted),
    ]);

    const plain = toPlain(refreshed ?? doc) as Record<string, unknown>;
    const brandId = plain.brandId ? String(plain.brandId) : undefined;
    let brandName: string | undefined;
    if (brandId) {
      const brand = await BrandModel.findById(brandId).select('name').lean();
      brandName = brand?.name ? String(brand.name) : undefined;
    }

    return {
      ...withComputedPricing(plain),
      brandName,
      variants,
      media,
      relationships,
    };
  }

  /**
   * Simple products (price only, no size/color options) still need a default variant
   * for cart/checkout. Create one automatically when missing.
   */
  async ensureDefaultVariant(productId: string, actor: ActorMeta = {}) {
    const product = await productRepository.findById(productId);
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

    const existing = await productRepository.findBySlug(slug);
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

    const doc = await ProductModel.create({
      name,
      slug,
      sku,
      shortDescription: payload.shortDescription ?? null,
      description: sanitizeRichText(payload.description as string | undefined) ?? null,
      brandId: payload.brandId ?? null,
      categoryId: payload.categoryId ?? null,
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

    const nextStatus = String((doc as { status?: string } | null)?.status ?? before.status);
    const nextPrice = Number(
      ((doc as { pricing?: { price?: number } } | null)?.pricing?.price ??
        before.pricing?.price ??
        0) as number,
    );
    if (
      nextPrice > 0 &&
      (nextStatus === PRODUCT_STATUS.ACTIVE ||
        nextStatus === PRODUCT_STATUS.SCHEDULED ||
        Boolean(payload.pricing))
    ) {
      await this.ensureDefaultVariant(id, actor);
    }

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
