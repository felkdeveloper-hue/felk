import { z } from 'zod';
import {
  mediaImageZodSchema,
  responsiveImageZodSchema,
  seoZodSchema,
  slugSchema,
} from '@/schemas/cms.shared.schema';
import { objectIdSchema } from '@/schemas/common.schema';

const statusSchema = z.enum(['draft', 'active', 'inactive', 'archived', 'published', 'scheduled']);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(),
  parentId: objectIdSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  image: mediaImageZodSchema,
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const brandCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  logo: mediaImageZodSchema,
  website: z.string().url().nullable().optional().or(z.literal('')),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const brandUpdateSchema = brandCreateSchema.partial();

export const collectionCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  type: z.enum(['manual', 'automated']).optional(),
  productIds: z.array(objectIdSchema).optional(),
  heroImage: mediaImageZodSchema,
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const collectionUpdateSchema = collectionCreateSchema.partial();

export const colorCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  code: z.string().trim().min(1).max(32),
  hex: z.string().nullable().optional(),
  swatchImage: mediaImageZodSchema,
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const colorUpdateSchema = colorCreateSchema.partial();

export const sizeCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  code: z.string().trim().min(1).max(32),
  chart: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const sizeUpdateSchema = sizeCreateSchema.partial();

export const materialCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  code: z.string().trim().min(1).max(64),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const materialUpdateSchema = materialCreateSchema.partial();

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const tagUpdateSchema = tagCreateSchema.partial();

export const occasionCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const occasionUpdateSchema = occasionCreateSchema.partial();

export const seasonCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  season: z.string().trim().min(1),
  year: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  heroImage: mediaImageZodSchema,
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const seasonUpdateSchema = seasonCreateSchema.partial();

const bannerCreate = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string().nullable().optional(),
  images: responsiveImageZodSchema,
  ctaLabel: z.string().nullable().optional(),
  ctaUrl: z.string().nullable().optional(),
  buttonText: z.string().nullable().optional(),
  priority: z.number().int().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  status: z.enum(['draft', 'active', 'scheduled', 'inactive', 'archived']).optional(),
});

export const heroBannerCreateSchema = bannerCreate.extend({
  collectionId: objectIdSchema.nullable().optional(),
});
export const heroBannerUpdateSchema = heroBannerCreateSchema.partial();

export const promoBannerCreateSchema = bannerCreate.extend({
  placement: z.string().optional(),
});
export const promoBannerUpdateSchema = promoBannerCreateSchema.partial();

export const announcementCreateSchema = z.object({
  message: z.string().trim().min(1),
  linkUrl: z.string().nullable().optional(),
  linkLabel: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  priority: z.number().int().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  status: z.enum(['draft', 'active', 'scheduled', 'inactive', 'archived']).optional(),
});
export const announcementUpdateSchema = announcementCreateSchema.partial();

export const homeSectionCreateSchema = z.object({
  key: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1),
  subtitle: z.string().nullable().optional(),
  type: z.enum(['hero', 'collection', 'products', 'banners', 'custom', 'html']).optional(),
  content: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
});
export const homeSectionUpdateSchema = homeSectionCreateSchema.partial();

export const faqCreateSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  category: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
});
export const faqUpdateSchema = faqCreateSchema.partial();

export const pageCreateSchema = z.object({
  title: z.string().trim().min(1),
  slug: slugSchema.optional(),
  content: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  featuredImage: mediaImageZodSchema,
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  seo: seoZodSchema,
  publishAt: z.coerce.date().nullable().optional(),
});
export const pageUpdateSchema = pageCreateSchema.partial();

export const blogCategoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  seo: seoZodSchema,
  status: statusSchema.optional(),
});
export const blogCategoryUpdateSchema = blogCategoryCreateSchema.partial();

export const blogCreateSchema = z.object({
  title: z.string().trim().min(1),
  slug: slugSchema.optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().optional(),
  coverImage: mediaImageZodSchema,
  categoryIds: z.array(objectIdSchema).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
  publishAt: z.coerce.date().nullable().optional(),
  seo: seoZodSchema,
});
export const blogUpdateSchema = blogCreateSchema.partial();

export const contactInfoCreateSchema = z.object({
  label: z.string().trim().min(1),
  type: z.enum(['email', 'phone', 'address', 'whatsapp', 'other']).optional(),
  value: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
export const contactInfoUpdateSchema = contactInfoCreateSchema.partial();

export const socialLinkCreateSchema = z.object({
  platform: z.string().trim().min(1),
  url: z.string().url(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
export const socialLinkUpdateSchema = socialLinkCreateSchema.partial();

export const shippingZoneCreateSchema = z.object({
  name: z.string().trim().min(1),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  rateType: z.enum(['flat', 'weight', 'free']).optional(),
  rate: z.number().optional(),
  currency: z.string().optional(),
  minOrderAmount: z.number().nullable().optional(),
  estimatedDaysMin: z.number().nullable().optional(),
  estimatedDaysMax: z.number().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
export const shippingZoneUpdateSchema = shippingZoneCreateSchema.partial();

export const taxConfigCreateSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  ratePercent: z.number().min(0).max(100),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  isInclusive: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
export const taxConfigUpdateSchema = taxConfigCreateSchema.partial();

export const currencyCreateSchema = z.object({
  code: z.string().trim().length(3),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1),
  decimalPlaces: z.number().int().min(0).max(4).optional(),
  exchangeRate: z.number().positive().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
export const currencyUpdateSchema = currencyCreateSchema.partial();

export const newsletterTemplateCreateSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});
export const newsletterTemplateUpdateSchema = newsletterTemplateCreateSchema.partial();

export const emailTemplateCreateSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});
export const emailTemplateUpdateSchema = emailTemplateCreateSchema.partial();

export const storeSettingUpsertSchema = z.object({
  key: z.string().trim().min(1),
  value: z.unknown(),
  type: z.enum(['string', 'number', 'boolean', 'json', 'secret']).optional(),
  group: z
    .enum([
      'store',
      'seo',
      'contact',
      'social',
      'shipping',
      'tax',
      'currency',
      'smtp',
      'analytics',
      'general',
    ])
    .optional(),
  isPublic: z.boolean().optional(),
  isEncrypted: z.boolean().optional(),
  description: z.string().nullable().optional(),
});
