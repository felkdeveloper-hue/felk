import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { reviewService } from '@/services/review.service';
import { storageService } from '@/services/storage.factory';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import { multiImageUpload } from '@/utils/file-upload.helper';
import * as S from '@/schemas/review.schema';
import { randomUUID } from 'node:crypto';

const P = PERMISSIONS;

const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  productId: z.string().min(1).optional(),
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const reviewsRouter = Router();

reviewsRouter.get(
  '/products/:productId/reviews',
  validate({ params: S.productIdParamsSchema, query: S.reviewListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await reviewService.listForProduct(String(req.params.productId), {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 10),
      sortBy: String(req.query.sortBy ?? 'createdAt'),
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') ?? 'desc',
      status: 'approved',
    });
    ApiResponse.success(
      res,
      { items: result.items, summary: result.summary },
      'OK',
      undefined,
      result.meta,
    );
  }),
);

reviewsRouter.get(
  '/products/:productId/reviews/eligibility',
  authenticate,
  authorizeAny(P.REVIEWS_CREATE, P.ACCOUNT_READ),
  validate({ params: S.productIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await reviewService.canReview(req.user, String(req.params.productId)));
  }),
);

reviewsRouter.post(
  '/products/:productId/reviews',
  authenticate,
  authorizeAny(P.REVIEWS_CREATE, P.ACCOUNT_UPDATE),
  validate({
    params: S.productIdParamsSchema,
    body: S.reviewCreateSchema.omit({ productId: true }),
  }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as {
      orderId: string;
      rating: number;
      title?: string;
      body: string;
      images?: Array<{ url: string; thumbnailUrl?: string | null; alt?: string | null }>;
    };
    const review = await reviewService.create(
      req.user,
      { ...body, productId: String(req.params.productId) },
      actorFromRequest(req),
    );
    ApiResponse.created(res, review, 'Review submitted for moderation');
  }),
);

reviewsRouter.post(
  '/products/:productId/reviews/upload',
  authenticate,
  authorizeAny(P.REVIEWS_CREATE, P.ACCOUNT_UPDATE),
  validate({ params: S.productIdParamsSchema }),
  multiImageUpload('images', 6),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw ApiError.badRequest('No images uploaded');

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split('.').pop() || 'jpg';
        const key = `reviews/${req.params.productId}/${randomUUID()}.${ext}`;
        const stored = await storageService.upload({
          key,
          body: file.buffer,
          contentType: file.mimetype,
        });
        return { url: stored.url, thumbnailUrl: stored.url, alt: file.originalname };
      }),
    );

    ApiResponse.success(res, uploaded, 'Images uploaded');
  }),
);

reviewsRouter.get(
  '/reviews',
  authenticate,
  authorizeAny(P.REVIEWS_MODERATE),
  validate({ query: adminListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await reviewService.listAdmin({
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
    });
    ApiResponse.success(res, result.items, 'OK', undefined, result.meta);
  }),
);

reviewsRouter.patch(
  '/reviews/:id',
  authenticate,
  authorizeAny(P.REVIEWS_MODERATE),
  validate({ params: S.reviewIdParamsSchema, body: S.reviewModerateSchema }),
  asyncHandler(async (req, res) => {
    const review = await reviewService.moderate(
      String(req.params.id),
      req.body as { status: 'approved' | 'rejected'; note?: string },
      actorFromRequest(req),
    );
    ApiResponse.success(res, review, 'Review updated');
  }),
);
