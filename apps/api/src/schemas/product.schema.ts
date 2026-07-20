import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from '@/schemas/common.schema';
import { seoZodSchema, slugSchema } from '@/schemas/cms.shared.schema';
import {
  PRODUCT_STATUS,
  PRODUCT_VISIBILITY,
  VARIANT_STATUS,
  RELATIONSHIP_TYPES,
  MEDIA_TYPES,
} from '@/constants/product';

const priceNumber = z.number().min(0);
const nullablePrice = z.number().min(0).nullable().optional();

export const pricingZodSchema = z
  .object({
    price: priceNumber,
    salePrice: nullablePrice,
    compareAtPrice: nullablePrice,
    costPrice: nullablePrice,
    currency: z.string().trim().min(3).max(3).optional(),
    taxClass: z.string().trim().nullable().optional(),
    saleStartsAt: z.coerce.date().nullable().optional(),
    saleEndsAt: z.coerce.date().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.salePrice != null && data.salePrice > data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sale price must be <= regular price',
        path: ['salePrice'],
      });
    }
    if (data.saleStartsAt && data.saleEndsAt && data.saleEndsAt < data.saleStartsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sale end must be after sale start',
        path: ['saleEndsAt'],
      });
    }
  });

export const specificationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
  group: z.string().trim().max(120).optional(),
  sortOrder: z.number().int().optional(),
});

export const attributeLinkSchema = z.object({
  attributeId: objectIdSchema,
  valueId: objectIdSchema.nullable().optional(),
  customValue: z.string().trim().max(500).nullable().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(),
  sku: z.string().trim().min(1).max(64).optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().max(50000).nullable().optional(),
  brandId: objectIdSchema.nullable().optional(),
  categoryId: objectIdSchema.nullable().optional(),
  subcategoryId: objectIdSchema.nullable().optional(),
  collectionIds: z.array(objectIdSchema).optional(),
  seasonId: objectIdSchema.nullable().optional(),
  materialId: objectIdSchema.nullable().optional(),
  gender: z.string().trim().max(40).nullable().optional(),
  ageGroup: z.string().trim().max(40).nullable().optional(),
  occasionIds: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().trim().max(60)).optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isClearance: z.boolean().optional(),
  status: z.enum(Object.values(PRODUCT_STATUS) as [string, ...string[]]).optional(),
  visibility: z.enum(Object.values(PRODUCT_VISIBILITY) as [string, ...string[]]).optional(),
  publishAt: z.coerce.date().nullable().optional(),
  archiveAt: z.coerce.date().nullable().optional(),
  seo: seoZodSchema,
  searchKeywords: z.array(z.string().trim().max(80)).optional(),
  specifications: z.array(specificationSchema).optional(),
  attributeLinks: z.array(attributeLinkSchema).optional(),
  pricing: pricingZodSchema.optional(),
  price: priceNumber.optional(),
  salePrice: nullablePrice,
  compareAtPrice: nullablePrice,
  costPrice: nullablePrice,
  currency: z.string().trim().min(3).max(3).optional(),
  taxClass: z.string().trim().nullable().optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt: z.coerce.date().nullable().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  visibility: z.string().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  brandId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subcategoryId: objectIdSchema.optional(),
  collectionId: objectIdSchema.optional(),
  tag: z.string().trim().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v)
        ? v
        : v
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  gender: z.string().optional(),
  isFeatured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isTrending: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isNewArrival: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isBestSeller: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isClearance: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  publishFrom: z.string().optional(),
  publishTo: z.string().optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const dimensionsSchema = z
  .object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.string().optional(),
  })
  .nullable()
  .optional();

export const variantCreateSchema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  barcode: z.string().trim().max(64).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  colorId: objectIdSchema.nullable().optional(),
  sizeId: objectIdSchema.nullable().optional(),
  optionValues: z.record(z.string()).optional(),
  weightGrams: z.number().min(0).nullable().optional(),
  dimensions: dimensionsSchema,
  price: priceNumber,
  salePrice: nullablePrice,
  costPrice: nullablePrice,
  compareAtPrice: nullablePrice,
  taxClass: z.string().trim().nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt: z.coerce.date().nullable().optional(),
  status: z.enum(Object.values(VARIANT_STATUS) as [string, ...string[]]).optional(),
  primaryImageId: objectIdSchema.nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional().or(z.literal('')),
  displayOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

export const variantUpdateSchema = variantCreateSchema.partial();

export const mediaRemoteCreateSchema = z.object({
  url: z.string().url(),
  type: z.enum(Object.values(MEDIA_TYPES) as [string, ...string[]]).optional(),
  alt: z.string().trim().max(300).optional(),
  key: z.string().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  mimeType: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  sizeBytes: z.number().int().optional(),
  priority: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
  isThumbnail: z.boolean().optional(),
  isGallery: z.boolean().optional(),
  variantId: objectIdSchema.nullable().optional(),
});

export const mediaUpdateSchema = z.object({
  alt: z.string().trim().max(300).optional(),
  priority: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
  isThumbnail: z.boolean().optional(),
  isGallery: z.boolean().optional(),
  variantId: objectIdSchema.nullable().optional(),
  type: z.enum(Object.values(MEDIA_TYPES) as [string, ...string[]]).optional(),
});

export const relationshipCreateSchema = z.object({
  relatedProductId: objectIdSchema,
  type: z.enum(Object.values(RELATIONSHIP_TYPES) as [string, ...string[]]),
  sortOrder: z.number().int().optional(),
});

export const relationshipReplaceSchema = z.object({
  type: z.enum(Object.values(RELATIONSHIP_TYPES) as [string, ...string[]]),
  relatedProductIds: z.array(objectIdSchema).max(100),
});

export const bulkProductCreateSchema = z.object({
  items: z.array(productCreateSchema).min(1).max(100),
});

export const bulkProductUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: objectIdSchema,
        data: productUpdateSchema,
      }),
    )
    .min(1)
    .max(100),
});

export const bulkIdsSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
});

export const productBulkStatusSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(200),
  status: z.enum(Object.values(PRODUCT_STATUS) as [string, ...string[]]),
});

export const publishProductSchema = z.object({
  publishAt: z.coerce.date().nullable().optional(),
});

export const attributeCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, 'code must be snake_case')
    .optional(),
  type: z.enum(['text', 'number', 'boolean', 'select', 'multiselect']).optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  isFilterable: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const attributeUpdateSchema = attributeCreateSchema.partial();

export const attributeValueCreateSchema = z.object({
  value: z.string().trim().min(1).max(120).optional(),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const attributeValueUpdateSchema = attributeValueCreateSchema.partial();

export const idParamsSchema = z.object({ id: objectIdSchema });
export const productIdParamsSchema = z.object({ productId: objectIdSchema });
export const variantIdParamsSchema = z.object({ variantId: objectIdSchema });
export const mediaIdParamsSchema = z.object({ mediaId: objectIdSchema });
export const relationshipIdParamsSchema = z.object({ relationshipId: objectIdSchema });
export const attributeIdParamsSchema = z.object({ attributeId: objectIdSchema });
export const valueIdParamsSchema = z.object({ valueId: objectIdSchema });
