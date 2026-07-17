import { RecentlyViewedModel, SavedItemModel } from '@/models/customer.models';
import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { customerService } from '@/services/customer.service';
import { ApiError } from '@/utils/errors/api-error';
import { RECENTLY_VIEWED_LIMIT } from '@/constants/customer';

export class RecentlyViewedService {
  async list(customerId: string, limit = 20) {
    await customerService.getById(customerId);
    return RecentlyViewedModel.find({ customerId })
      .sort({ viewedAt: -1 })
      .limit(Math.min(limit, RECENTLY_VIEWED_LIMIT))
      .populate('productId', 'name slug status pricing')
      .populate('variantId', 'sku title price')
      .lean();
  }

  async track(customerId: string, payload: { productId: string; variantId?: string | null }) {
    await customerService.getById(customerId);

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
      if (!variant) throw ApiError.notFound('Variant not found');
    }

    const filter = {
      customerId,
      productId: payload.productId,
      variantId: payload.variantId ?? null,
    };

    const row = await RecentlyViewedModel.findOneAndUpdate(
      filter,
      { $set: { viewedAt: new Date() }, $setOnInsert: filter },
      { upsert: true, new: true },
    );

    await this.cleanup(customerId);
    return row;
  }

  /** Keep only the newest N rows per customer. */
  async cleanup(customerId: string) {
    const rows = await RecentlyViewedModel.find({ customerId })
      .sort({ viewedAt: -1 })
      .select('_id')
      .lean();

    if (rows.length <= RECENTLY_VIEWED_LIMIT) {
      return { removed: 0 };
    }

    const toRemove = rows.slice(RECENTLY_VIEWED_LIMIT).map((r) => r._id);
    const result = await RecentlyViewedModel.deleteMany({ _id: { $in: toRemove } });
    return { removed: result.deletedCount };
  }

  async clear(customerId: string) {
    await customerService.getById(customerId);
    const result = await RecentlyViewedModel.deleteMany({ customerId });
    return { removed: result.deletedCount };
  }
}

export class SavedItemService {
  async list(customerId: string) {
    await customerService.getById(customerId);
    return SavedItemModel.find({ customerId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate('productId', 'name slug status pricing')
      .populate('variantId', 'sku title price');
  }

  async add(
    customerId: string,
    payload: { productId: string; variantId?: string | null; note?: string },
  ) {
    await customerService.getById(customerId);
    const product = await ProductModel.findOne({
      _id: payload.productId,
      isDeleted: false,
    });
    if (!product) throw ApiError.notFound('Product not found');

    try {
      return await SavedItemModel.create({
        customerId,
        productId: payload.productId,
        variantId: payload.variantId ?? null,
        note: payload.note ?? null,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Item already saved');
      }
      throw error;
    }
  }

  async remove(customerId: string, itemId: string) {
    const item = await SavedItemModel.findOneAndUpdate(
      { _id: itemId, customerId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );
    if (!item) throw ApiError.notFound('Saved item not found');
    return item;
  }
}

export const recentlyViewedService = new RecentlyViewedService();
export const savedItemService = new SavedItemService();
