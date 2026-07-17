import { randomBytes } from 'node:crypto';
import { WishlistModel, WishlistItemModel } from '@/models/customer.models';
import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { customerService } from '@/services/customer.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { CUSTOMER_AUDIT, WISHLIST_VISIBILITY } from '@/constants/customer';

export class WishlistService {
  async list(customerId: string) {
    await customerService.getById(customerId);
    return WishlistModel.find({ customerId, isDeleted: false }).sort({
      isDefault: -1,
      updatedAt: -1,
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
      .populate('productId', 'name slug status pricing')
      .populate('variantId', 'sku title price');

    return { ...wishlist.toObject(), items };
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

    await writeAuditLog({
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
    await this.getById(customerId, wishlistId);

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

    await writeAuditLog({
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

    await writeAuditLog({
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
    await this.getById(customerId, wishlistId);

    const product = await ProductModel.findOne({
      _id: payload.productId,
      isDeleted: false,
    });
    if (!product) throw ApiError.notFound('Product not found');

    if (payload.variantId) {
      const variant = await ProductVariantModel.findOne({
        _id: payload.variantId,
        productId: payload.productId,
        isDeleted: false,
      });
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

      await writeAuditLog({
        action: 'customers.wishlist_item_added',
        resourceType: 'wishlist_items',
        resourceId: item._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: item.toObject() as Record<string, unknown>,
      });

      return item;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Item already in wishlist');
      }
      throw error;
    }
  }

  async removeItem(customerId: string, wishlistId: string, itemId: string, actor: ActorMeta) {
    await this.getById(customerId, wishlistId);
    const before = await WishlistItemModel.findOne({
      _id: itemId,
      wishlistId,
      customerId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Wishlist item not found');

    const item = await WishlistItemModel.findOneAndUpdate(
      { _id: itemId, wishlistId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await WishlistModel.updateOne(
      { _id: wishlistId, itemCount: { $gt: 0 } },
      { $inc: { itemCount: -1 } },
    );

    await writeAuditLog({
      action: 'customers.wishlist_item_removed',
      resourceType: 'wishlist_items',
      resourceId: itemId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return item;
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

    await writeAuditLog({
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
      .populate('productId', 'name slug status pricing')
      .populate('variantId', 'sku title price');

    return {
      name: wishlist.name,
      visibility: wishlist.visibility,
      items,
    };
  }
}

export const wishlistService = new WishlistService();
