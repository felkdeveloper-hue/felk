import { Types } from 'mongoose';
import { ORDER_STATUS } from '@/constants/order-status';
import { ReviewModel, REVIEW_STATUS, type ReviewDocument } from '@/models/review.model';
import { OrderModel } from '@/models/order.models';
import { ProductModel } from '@/models/product.models';
import { customerService } from '@/services/customer.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import type { AuthenticatedUser } from '@/types';

const RECEIVED_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED] as const;

function serialize(review: ReviewDocument) {
  const obj = review.toObject();
  return {
    id: String(obj._id),
    productId: String(obj.productId),
    customerId: String(obj.customerId),
    orderId: String(obj.orderId),
    rating: obj.rating,
    title: obj.title ?? null,
    body: obj.body,
    images: obj.images ?? [],
    status: obj.status,
    isVerifiedPurchase: obj.isVerifiedPurchase,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export class ReviewService {
  async listForProduct(
    productId: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: string;
      includePending?: boolean;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter: Record<string, unknown> = {
      productId,
      isDeleted: false,
      status: query.status ?? REVIEW_STATUS.APPROVED,
    };

    const sortField = query.sortBy === 'rating' ? 'rating' : 'createdAt';
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit),
      ReviewModel.countDocuments(filter),
    ]);

    const summary = await this.getSummary(productId);

    return {
      items: items.map(serialize),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      summary,
    };
  }

  async getSummary(productId: string) {
    const rows = await ReviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          isDeleted: false,
          status: REVIEW_STATUS.APPROVED,
        },
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const rating = Number(row._id);
      const count = Number(row.count);
      distribution[rating] = count;
      total += count;
      sum += rating * count;
    }

    const average = total ? Math.round((sum / total) * 10) / 10 : 0;
    const recommendRate = total
      ? Math.round((((distribution[4] ?? 0) + (distribution[5] ?? 0)) / total) * 100)
      : 0;

    const imageReviews = await ReviewModel.find({
      productId,
      isDeleted: false,
      status: REVIEW_STATUS.APPROVED,
      'images.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(24)
      .select('images rating createdAt');

    const customerImages = imageReviews.flatMap((review) =>
      (review.images ?? []).map((image) => ({
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        alt: image.alt,
        rating: review.rating,
      })),
    );

    return {
      average,
      total,
      recommendRate,
      distribution,
      customerImages,
    };
  }

  async listAdmin(query: { page?: number; limit?: number; status?: string; productId?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.productId) filter.productId = query.productId;

    const [items, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReviewModel.countDocuments(filter),
    ]);

    return {
      items: items.map(serialize),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async canReview(user: AuthenticatedUser, productId: string) {
    const customer = await customerService.ensureForUser(user, {
      userId: user.id,
      ip: undefined,
      requestId: undefined,
    });

    const orders = await OrderModel.find({
      customerId: customer._id,
      status: { $in: [...RECEIVED_STATUSES] },
      isDeleted: false,
      'items.productId': productId,
    })
      .sort({ deliveredAt: -1, updatedAt: -1 })
      .limit(10);

    if (!orders.length) {
      return {
        eligible: false,
        reason: 'You can review this product after your order is delivered.',
      };
    }

    for (const order of orders) {
      const existing = await ReviewModel.findOne({
        productId,
        customerId: customer._id,
        orderId: order._id,
        isDeleted: false,
      });
      if (!existing) {
        return {
          eligible: true,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        };
      }
    }

    return {
      eligible: false,
      reason: 'You already reviewed this product for your delivered orders.',
    };
  }

  async create(
    user: AuthenticatedUser,
    payload: {
      productId: string;
      orderId: string;
      rating: number;
      title?: string;
      body: string;
      images?: Array<{ url: string; thumbnailUrl?: string | null; alt?: string | null }>;
    },
    actor: ActorMeta,
  ) {
    const product = await ProductModel.findOne({ _id: payload.productId, isDeleted: false });
    if (!product) throw ApiError.notFound('Product not found');

    const customer = await customerService.ensureForUser(user, actor);

    const order = await OrderModel.findOne({
      _id: payload.orderId,
      customerId: customer._id,
      isDeleted: false,
      status: { $in: [...RECEIVED_STATUSES] },
      'items.productId': payload.productId,
    });

    if (!order) {
      throw ApiError.forbidden(
        'Only customers who received this product can leave a review.',
        'REVIEW_NOT_ELIGIBLE',
      );
    }

    const duplicate = await ReviewModel.findOne({
      productId: payload.productId,
      customerId: customer._id,
      orderId: order._id,
      isDeleted: false,
    });
    if (duplicate) throw ApiError.conflict('You already reviewed this product for that order.');

    const review = await ReviewModel.create({
      productId: payload.productId,
      customerId: customer._id,
      orderId: order._id,
      userId: user.id,
      rating: payload.rating,
      title: payload.title ?? null,
      body: payload.body,
      images: payload.images ?? [],
      status: REVIEW_STATUS.PENDING,
      isVerifiedPurchase: true,
    });

    return serialize(review);
  }

  async moderate(
    reviewId: string,
    payload: { status: 'approved' | 'rejected'; note?: string },
    actor: ActorMeta,
  ) {
    const review = await ReviewModel.findOne({ _id: reviewId, isDeleted: false });
    if (!review) throw ApiError.notFound('Review not found');

    review.status = payload.status;
    review.moderationNote = payload.note ?? null;
    review.moderatedBy = actor.userId ? new Types.ObjectId(actor.userId) : null;
    review.moderatedAt = new Date();
    await review.save();

    return serialize(review);
  }
}

export const reviewService = new ReviewService();
