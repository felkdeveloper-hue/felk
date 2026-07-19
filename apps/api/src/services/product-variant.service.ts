import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { productRepository } from '@/repositories/product.repository';
import { writeAuditLog, writeActivityLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { productService } from '@/services/product.service';
import {
  allocateUniqueLinkedSku,
  allocateUniqueParentSku,
  isSkuTaken,
} from '@/services/sku-allocation.service';
import { ApiError } from '@/utils/errors/api-error';
import { assertSalePriceValid, computePricing } from '@/utils/pricing.helper';
import { parseSkuNumeric } from '@/utils/sku.helper';
import { PRODUCT_AUDIT } from '@/constants/product';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function validateVariantPricing(payload: {
  price: number;
  salePrice?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
}) {
  try {
    assertSalePriceValid(payload.price, payload.salePrice);
  } catch {
    throw ApiError.badRequest(
      'Sale price must be less than or equal to regular price',
      undefined,
      'SALE_PRICE_INVALID',
    );
  }
  if (payload.saleStartsAt && payload.saleEndsAt) {
    if (new Date(payload.saleEndsAt) < new Date(payload.saleStartsAt)) {
      throw ApiError.badRequest('Sale end must be after sale start');
    }
  }
}

export class ProductVariantService {
  async listByProduct(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    const variants = await ProductVariantModel.find({
      productId,
      isDeleted: false,
    }).sort({ displayOrder: 1 });

    return variants.map((v) => ({
      ...toPlain(v),
      pricingInsights: computePricing({
        price: v.price,
        salePrice: v.salePrice,
        compareAtPrice: v.compareAtPrice,
        costPrice: v.costPrice,
        saleStartsAt: v.saleStartsAt,
        saleEndsAt: v.saleEndsAt,
      }),
    }));
  }

  async getById(variantId: string) {
    const variant = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!variant) throw ApiError.notFound('Variant not found');
    return {
      ...toPlain(variant),
      pricingInsights: computePricing({
        price: variant.price,
        salePrice: variant.salePrice,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        saleStartsAt: variant.saleStartsAt,
        saleEndsAt: variant.saleEndsAt,
      }),
    };
  }

  private async assertUniqueSkuBarcode(sku: string, barcode?: string | null, excludeId?: string) {
    if (await isSkuTaken(sku, { excludeVariantId: excludeId })) {
      throw ApiError.conflict('SKU already exists', undefined, 'SKU_EXISTS');
    }

    if (barcode) {
      const barcodeExisting = await ProductVariantModel.findOne({
        barcode,
        isDeleted: false,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      });
      if (barcodeExisting) {
        throw ApiError.conflict('Barcode already exists', undefined, 'BARCODE_EXISTS');
      }
    }
  }

  async create(productId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    let parentSku = product.sku ? String(product.sku).toUpperCase() : null;
    if (!parentSku || parseSkuNumeric(parentSku) == null) {
      parentSku = await allocateUniqueParentSku();
      await ProductModel.updateOne({ _id: productId }, { $set: { sku: parentSku } });
    }

    const siblings = await ProductVariantModel.find({ productId, isDeleted: false }).select('sku');
    const siblingSkus = siblings.map((row) => String(row.sku));

    const sku = payload.sku
      ? String(payload.sku).toUpperCase()
      : await allocateUniqueLinkedSku(parentSku, siblingSkus);
    const barcode = (payload.barcode as string | null | undefined) ?? null;
    await this.assertUniqueSkuBarcode(sku, barcode);

    const price = Number(payload.price ?? product.pricing?.price ?? 0);
    validateVariantPricing({
      price,
      salePrice: payload.salePrice as number | null | undefined,
      saleStartsAt: payload.saleStartsAt as string | null | undefined,
      saleEndsAt: payload.saleEndsAt as string | null | undefined,
    });

    const variant = await ProductVariantModel.create({
      productId,
      sku,
      barcode,
      title: payload.title ?? `${product.name} - ${sku}`,
      colorId: payload.colorId ?? null,
      sizeId: payload.sizeId ?? null,
      optionValues: payload.optionValues ?? {},
      weightGrams: payload.weightGrams ?? null,
      dimensions: payload.dimensions ?? null,
      price,
      salePrice: payload.salePrice ?? null,
      costPrice: payload.costPrice ?? null,
      compareAtPrice: payload.compareAtPrice ?? null,
      taxClass: payload.taxClass ?? null,
      currency: payload.currency ?? product.pricing?.currency ?? 'LKR',
      saleStartsAt: payload.saleStartsAt ?? null,
      saleEndsAt: payload.saleEndsAt ?? null,
      status: payload.status ?? 'active',
      primaryImageId: payload.primaryImageId ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      displayOrder: payload.displayOrder ?? 0,
      isDefault: Boolean(payload.isDefault),
    });

    if (variant.isDefault) {
      await ProductVariantModel.updateMany(
        { productId, _id: { $ne: variant._id } },
        { $set: { isDefault: false } },
      );
      await ProductModel.updateOne({ _id: productId }, { $set: { defaultVariantId: variant._id } });
    }

    await productService.refreshVariantCount(productId);

    await writeAuditLog({
      action: PRODUCT_AUDIT.VARIANT_ADDED,
      resourceType: 'product_variants',
      resourceId: variant._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(variant),
      metadata: { productId },
    });
    await writeActivityLog({
      summary: `Added variant ${variant.sku}`,
      module: 'products',
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { productId, variantId: variant._id.toString() },
    });

    return variant;
  }

  async update(variantId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Variant not found');

    if (payload.sku || payload.barcode !== undefined) {
      await this.assertUniqueSkuBarcode(
        String(payload.sku ?? before.sku),
        payload.barcode !== undefined ? (payload.barcode as string | null) : before.barcode,
        variantId,
      );
    }

    const nextPrice = Number(payload.price ?? before.price);
    validateVariantPricing({
      price: nextPrice,
      salePrice:
        payload.salePrice !== undefined ? (payload.salePrice as number | null) : before.salePrice,
      saleStartsAt: (payload.saleStartsAt as string | null | undefined) ?? before.saleStartsAt,
      saleEndsAt: (payload.saleEndsAt as string | null | undefined) ?? before.saleEndsAt,
    });

    if (payload.sku) payload.sku = String(payload.sku).toUpperCase();

    const priceChanged =
      (payload.price !== undefined && payload.price !== before.price) ||
      (payload.salePrice !== undefined && payload.salePrice !== before.salePrice);

    const variant = await ProductVariantModel.findOneAndUpdate(
      { _id: variantId, isDeleted: false },
      { $set: payload },
      { new: true },
    );
    if (!variant) throw ApiError.notFound('Variant not found');

    if (payload.isDefault === true) {
      await ProductVariantModel.updateMany(
        { productId: variant.productId, _id: { $ne: variant._id } },
        { $set: { isDefault: false } },
      );
      await ProductModel.updateOne(
        { _id: variant.productId },
        { $set: { defaultVariantId: variant._id } },
      );
    }

    await writeAuditLog({
      action: 'products.variant_updated',
      resourceType: 'product_variants',
      resourceId: variantId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      after: toPlain(variant),
    });

    if (priceChanged) {
      await writeAuditLog({
        action: PRODUCT_AUDIT.PRICE_CHANGED,
        resourceType: 'product_variants',
        resourceId: variantId,
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        before: {
          price: before.price,
          salePrice: before.salePrice,
        },
        after: {
          price: variant.price,
          salePrice: variant.salePrice,
        },
        metadata: { productId: variant.productId.toString() },
      });
    }

    return variant;
  }

  async remove(variantId: string, actor: ActorMeta) {
    const before = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Variant not found');

    const variant = await ProductVariantModel.findOneAndUpdate(
      { _id: variantId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await productService.refreshVariantCount(before.productId.toString());

    await writeAuditLog({
      action: PRODUCT_AUDIT.VARIANT_REMOVED,
      resourceType: 'product_variants',
      resourceId: variantId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      metadata: { productId: before.productId.toString() },
    });

    return variant;
  }

  async clone(variantId: string, actor: ActorMeta) {
    const source = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!source) throw ApiError.notFound('Variant not found');

    const sku = `${source.sku}-CLONE-${Date.now().toString(36)}`.slice(0, 64);
    return this.create(
      source.productId.toString(),
      {
        sku,
        barcode: null,
        title: `${source.title} (Clone)`,
        colorId: source.colorId,
        sizeId: source.sizeId,
        optionValues: source.optionValues
          ? Object.fromEntries(
              source.optionValues instanceof Map
                ? source.optionValues.entries()
                : Object.entries(source.optionValues as Record<string, string>),
            )
          : {},
        weightGrams: source.weightGrams,
        dimensions: source.dimensions,
        price: source.price,
        salePrice: source.salePrice,
        costPrice: source.costPrice,
        compareAtPrice: source.compareAtPrice,
        taxClass: source.taxClass,
        currency: source.currency,
        saleStartsAt: source.saleStartsAt,
        saleEndsAt: source.saleEndsAt,
        status: source.status,
        displayOrder: (source.displayOrder ?? 0) + 1,
        isDefault: false,
        thumbnailUrl: source.thumbnailUrl,
      },
      actor,
    );
  }
}

export const productVariantService = new ProductVariantService();
