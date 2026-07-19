import { z } from 'zod';

export const reviewCreateSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10).max(4000),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        thumbnailUrl: z.string().url().optional().nullable(),
        alt: z.string().max(160).optional().nullable(),
      }),
    )
    .max(6)
    .optional()
    .default([]),
});

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const reviewModerateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).optional(),
});

export const reviewIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const productIdParamsSchema = z.object({
  productId: z.string().min(1),
});
