import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { WishlistModel, WishlistItemModel } from '@/models/customer.models.js';
import { ProductModel, ProductVariantModel, ProductMediaModel } from '@/models/product.models.js';
import { customerService } from '@/services/customer.service.js';
import { writeAuditLog } from '@/services/audit.service.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { CUSTOMER_AUDIT, WISHLIST_VISIBILITY } from '@/constants/customer.js';

type LeanWishlistItem = {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  note?: string | null;
  addedAt?: Date;
};

function mediaUrl(doc: { url?: string | null; thumbnailUrl?: string | null } | null | undefined) {
  if (!doc) return null;
  if (doc.url) return String(doc.url);
  if (doc.thumbnailUrl) return String(doc.thumbnailUrl);
  return null;
}

export class WishlistService {
  async list(customerId: string) {
    await customerService.getById(customerId);
    return WishlistModel.find({ customerId, isDeleted: false }).sort({
      isDefault: -1,
      updatedAt: -1,
    });
  }

  private async assertWishlistExists(customerId: string, wishlistId: string) {
    const wishlist = await WishlistModel.findOne({
      _id: wishlistId,
      customerId,
      isDeleted: false,
    })
      .select('_id')
      .lean();
    if (!wishlist) throw ApiError.notFound('Wishlist not found');
  }

  private async enrichItems(rawItems: LeanWishlistItem[]) {
    if (rawItems.length === 0) return [];

    const productIds = [...new Set(rawItems.map((item) => item.productId.toString()))];
    const variantIds = [
      ...new Set(
        rawItems
          .map((item) => item.variantId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [products, variants, mediaRows] = await Promise.all([
      ProductModel.find({ _id: { $in: productIds }, isDeleted: false })
        .select('name slug status pricing')
        .lean(),
      variantIds.length
        ? ProductVariantModel.find({ _id: { $in: variantIds }, isDeleted: false })
            .select('sku title price thumbnailUrl productId')
            .lean()
        : Promise.resolve([]),
      ProductMediaModel.find({
        productId: { $in: productIds },
        isDeleted: false,
      })
        .sort({ isPrimary: -1, priority: 1, createdAt: 1 })
        .select('productId variantId url thumbnailUrl')
        .lean(),
    ]);

    const productById = new Map(products.map((p) => [String(p._id), p]));
    const variantById = new Map(variants.map((v) => [String(v._id), v]));

    const mediaByVariant = new Map<string, string>();
    const mediaByProduct = new Map<string, string>();
    for (const row of mediaRows) {
      const url = mediaUrl(row);
      if (!url) continue;
      const productKey = String(row.productId);
      if (row.variantId) {
        const variantKey = String(row.variantId);
        if (!mediaByVariant.has(variantKey)) mediaByVariant.set(variantKey, url);
      } else if (!mediaByProduct.has(productKey)) {
        mediaByProduct.set(productKey, url);
      }
      if (!mediaByProduct.has(productKey)) mediaByProduct.set(productKey, url);
    }

    return rawItems.map((item) => {
      const productId = item.productId.toString();
      const variantId = item.variantId ? item.variantId.toString() : undefined;
      const product = productById.get(productId);
      const variant = variantId ? variantById.get(variantId) : undefined;

      const thumbnailUrl =
        (variantId ? mediaByVariant.get(variantId) : undefined) ??
        (typeof variant?.thumbnailUrl === 'string' ? variant.thumbnailUrl : undefined) ??
        mediaByProduct.get(productId) ??
        null;

      const pricing = product?.pricing as
        { price?: number; currency?: string } | number | undefined;
      const productPrice =
        typeof pricing === 'number'
          ? pricing
          : typeof pricing?.price === 'number'
            ? pricing.price
            : 0;
      const priceAmount = Number(variant?.price ?? productPrice ?? 0);
      const currency =
        typeof pricing === 'object' && typeof pricing?.currency === 'string'
          ? pricing.currency
          : 'LKR';

      return {
        id: item._id.toString(),
        _id: item._id,
        productId,
        variantId: variantId ?? null,
        note: item.note ?? null,
        addedAt: item.addedAt,
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
        productStatus: product?.status ?? null,
        variantSku: variant?.sku ?? null,
        variantTitle: variant?.title ?? null,
        thumbnailUrl,
        price: priceAmount ? { amount: priceAmount, currency } : null,
        // Keep nested shapes for older clients / FE normalize fallback.
        product: product
          ? {
              id: productId,
              _id: product._id,
              name: product.name,
              slug: product.slug,
              status: product.status,
              pricing: product.pricing,
              thumbnailUrl,
            }
          : undefined,
        variant: variant
          ? {
              id: variantId,
              _id: variant._id,
              sku: variant.sku,
              title: variant.title,
              price: variant.price,
              thumbnailUrl: variant.thumbnailUrl ?? thumbnailUrl,
            }
          : undefined,
      };
    });
  }

  async getById(customerId: string, wishlistId: string) {
    const wishlist = await WishlistModel.findOne({
      _id: wishlistId,
      customerId,
      isDeleted: false,
    });
    if (!wishlist) throw ApiError.notFound('Wishlist not found');

    const items = await WishlistItemModel.find({
      wishlistId,
      isDeleted: false,
    })
      .sort({ addedAt: -1 })
      .select('productId variantId note addedAt')
      .lean<LeanWishlistItem[]>();

    return {
      ...wishlist.toObject(),
      id: wishlist._id.toString(),
      items: await this.enrichItems(items),
    };
  }

  async create(customerId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    await customerService.getById(customerId);

    const isDefault = Boolean(payload.isDefault);
    if (isDefault) {
      await WishlistModel.updateMany(
        { customerId, isDeleted: false },
        { $set: { isDefault: false } },
      );
    }

    const count = await WishlistModel.countDocuments({ customerId, isDeleted: false });
    const wishlist = await WishlistModel.create({
      customerId,
      name: payload.name ?? 'My Wishlist',
      visibility: payload.visibility ?? WISHLIST_VISIBILITY.PRIVATE,
      isDefault: isDefault || count === 0,
      itemCount: 0,
      shareToken: null,
    });

    void writeAuditLog({
      action: CUSTOMER_AUDIT.WISHLIST_CREATED,
      resourceType: 'wishlists',
      resourceId: wishlist._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: wishlist.toObject() as Record<string, unknown>,
      metadata: { customerId },
    });

    return wishlist;
  }

  async update(
    customerId: string,
    wishlistId: string,
    payload: Record<string, unknown>,
    actor: ActorMeta,
  ) {
    await this.assertWishlistExists(customerId, wishlistId);

    if (payload.isDefault === true) {
      await WishlistModel.updateMany(
        { customerId, isDeleted: false, _id: { $ne: wishlistId } },
        { $set: { isDefault: false } },
      );
    }

    const wishlist = await WishlistModel.findOneAndUpdate(
      { _id: wishlistId, customerId, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    void writeAuditLog({
      action: 'customers.wishlist_updated',
      resourceType: 'wishlists',
      resourceId: wishlistId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: wishlist?.toObject() as Record<string, unknown>,
    });

    return wishlist;
  }

  async remove(customerId: string, wishlistId: string, actor: ActorMeta) {
    const before = await WishlistModel.findOne({
      _id: wishlistId,
      customerId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Wishlist not found');

    const wishlist = await WishlistModel.findOneAndUpdate(
      { _id: wishlistId, customerId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await WishlistItemModel.updateMany(
      { wishlistId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );

    void writeAuditLog({
      action: CUSTOMER_AUDIT.WISHLIST_DELETED,
      resourceType: 'wishlists',
      resourceId: wishlistId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      metadata: { customerId },
    });

    return wishlist;
  }

  async addItem(
    customerId: string,
    wishlistId: string,
    payload: { productId: string; variantId?: string | null; note?: string },
    actor: ActorMeta,
  ) {
    await this.assertWishlistExists(customerId, wishlistId);

    const product = await ProductModel.findOne({
      _id: payload.productId,
      isDeleted: false,
    })
      .select('_id')
      .lean();
    if (!product) throw ApiError.notFound('Product not found');

    if (payload.variantId) {
      const variant = await ProductVariantModel.findOne({
        _id: payload.variantId,
        productId: payload.productId,
        isDeleted: false,
      })
        .select('_id')
        .lean();
      if (!variant) throw ApiError.notFound('Variant not found for product');
    }

    try {
      const item = await WishlistItemModel.create({
        wishlistId,
        customerId,
        productId: payload.productId,
        variantId: payload.variantId ?? null,
        note: payload.note ?? null,
        addedAt: new Date(),
      });

      await WishlistModel.updateOne({ _id: wishlistId }, { $inc: { itemCount: 1 } });

      void writeAuditLog({
        action: 'customers.wishlist_item_added',
        resourceType: 'wishlist_items',
        resourceId: item._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: item.toObject() as Record<string, unknown>,
      });

      return this.getById(customerId, wishlistId);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Item already in wishlist');
      }
      throw error;
    }
  }

  async removeItem(customerId: string, wishlistId: string, itemId: string, actor: ActorMeta) {
    await this.assertWishlistExists(customerId, wishlistId);
    const before = await WishlistItemModel.findOne({
      _id: itemId,
      wishlistId,
      customerId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Wishlist item not found');

    await WishlistItemModel.findOneAndUpdate(
      { _id: itemId, wishlistId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await WishlistModel.updateOne(
      { _id: wishlistId, itemCount: { $gt: 0 } },
      { $inc: { itemCount: -1 } },
    );

    void writeAuditLog({
      action: 'customers.wishlist_item_removed',
      resourceType: 'wishlist_items',
      resourceId: itemId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return this.getById(customerId, wishlistId);
  }

  /** Structure for future share / public wishlist links. */
  async enableShare(customerId: string, wishlistId: string, actor: ActorMeta) {
    const wishlist = await WishlistModel.findOne({
      _id: wishlistId,
      customerId,
      isDeleted: false,
    });
    if (!wishlist) throw ApiError.notFound('Wishlist not found');

    const shareToken = wishlist.shareToken ?? randomBytes(16).toString('hex');
    wishlist.shareToken = shareToken;
    wishlist.visibility = WISHLIST_VISIBILITY.SHARED;
    await wishlist.save();

    void writeAuditLog({
      action: 'customers.wishlist_share_enabled',
      resourceType: 'wishlists',
      resourceId: wishlistId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { shareToken },
    });

    return {
      wishlistId,
      visibility: wishlist.visibility,
      shareToken,
      sharePath: `/wishlists/shared/${shareToken}`,
    };
  }

  async getByShareToken(shareToken: string) {
    const wishlist = await WishlistModel.findOne({
      shareToken,
      isDeleted: false,
      visibility: { $in: [WISHLIST_VISIBILITY.SHARED, WISHLIST_VISIBILITY.PUBLIC] },
    });
    if (!wishlist) throw ApiError.notFound('Shared wishlist not found');

    const items = await WishlistItemModel.find({
      wishlistId: wishlist._id,
      isDeleted: false,
    })
      .sort({ addedAt: -1 })
      .select('productId variantId note addedAt')
      .lean<LeanWishlistItem[]>();

    return {
      name: wishlist.name,
      visibility: wishlist.visibility,
      items: await this.enrichItems(items),
    };
  }
}

export const wishlistService = new WishlistService();
