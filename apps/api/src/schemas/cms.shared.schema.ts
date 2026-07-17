import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from '@/schemas/common.schema';
import { REGEX } from '@/constants/regex';

export const seoZodSchema = z
  .object({
    title: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    canonicalUrl: z.string().url().nullable().optional().or(z.literal('')),
    keywords: z.array(z.string().trim()).optional(),
    ogImage: z.string().nullable().optional(),
    twitterCard: z.string().optional(),
    schemaJson: z.record(z.unknown()).nullable().optional(),
    robots: z.string().optional(),
  })
  .optional();

export const mediaImageZodSchema = z
  .object({
    url: z.string().url(),
    key: z.string().nullable().optional(),
    alt: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

export const responsiveImageZodSchema = z
  .object({
    desktop: mediaImageZodSchema,
    tablet: mediaImageZodSchema,
    mobile: mediaImageZodSchema,
  })
  .optional();

export const slugSchema = z.string().trim().regex(REGEX.SLUG, 'Invalid slug');

export const cmsListQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  isDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const idsBodySchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
});

export const bulkStatusSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
  status: z.string().min(1),
});

export const PUBLISH_STATUS = [
  'draft',
  'published',
  'scheduled',
  'archived',
  'inactive',
  'active',
] as const;
