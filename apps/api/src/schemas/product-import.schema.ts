import { z } from 'zod';
import {
  PRODUCT_IMPORT_BATCH_LIMIT,
  PRODUCT_STATUS,
  PRODUCT_VISIBILITY,
} from '@/constants/product';

const importVariantSchema = z.object({
  row: z.number().int().min(0).default(0),
  color: z.string().trim().max(120).default(''),
  size: z.string().trim().max(120).default(''),
  price: z.number().positive(),
  salePrice: z.number().min(0).nullable().default(null),
  comparePrice: z.number().min(0).nullable().default(null),
  stock: z.number().int().min(0).nullable().default(null),
  sku: z.string().trim().max(64).default(''),
  // HTTPS URLs or ZIP filenames (e.g. shirt-front.jpg) — resolved during import
  images: z.array(z.string().trim().min(1).max(2048)).max(20).default([]),
  ownListing: z.boolean().default(false),
  defaultListing: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  variantPosition: z.number().int().min(0).default(0),
});

const importProductSchema = z.object({
  handle: z.string().trim().min(1).max(220),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(220),
  category: z.string().trim().min(1).max(160),
  gender: z.string().trim().max(40).default(''),
  brand: z.string().trim().max(160).default(''),
  material: z.string().trim().max(160).default(''),
  occasions: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  shortDescription: z.string().trim().max(500).default(''),
  description: z.string().trim().max(20_000).default(''),
  specifications: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(300),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .max(40)
    .default([]),
  seoTitle: z.string().trim().max(200).default(''),
  seoDescription: z.string().trim().max(500).default(''),
  paymentOption: z.enum(['cod', 'prepaid', 'both']).default('both'),
  returnsAvailable: z.boolean().default(true),
  returnsCriteria: z.string().trim().max(500).default(''),
  warrantyAvailable: z.boolean().default(false),
  warrantyDetails: z.string().trim().max(500).default(''),
  status: z.enum([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.ACTIVE]).default(PRODUCT_STATUS.DRAFT),
  visibility: z.string().trim().max(40).default(PRODUCT_VISIBILITY.PUBLIC),
  isBestSeller: z.boolean().default(false),
  isMoreToLove: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  rows: z.array(z.number().int().min(0)).default([]),
  variants: z.array(importVariantSchema).min(1).max(200),
});

export const productImportSchema = z.object({
  publish: z.boolean().optional(),
  /** Session created during preview when an images ZIP was uploaded */
  imagesSessionId: z.string().uuid().optional(),
  products: z.array(importProductSchema).min(1).max(PRODUCT_IMPORT_BATCH_LIMIT),
});
