import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { createCrudRouter } from '@/routes/cms/create-crud-router';
import {
  BrandModel,
  CategoryModel,
  CollectionModel,
  ColorModel,
  MaterialModel,
  OccasionModel,
  ProductTagModel,
  SeasonCollectionModel,
  SizeModel,
} from '@/models/master-data.models';
import {
  AnnouncementBarModel,
  BlogCategoryModel,
  BlogPostModel,
  CmsPageModel,
  FaqModel,
  HeroBannerModel,
  HomeSectionModel,
  PromoBannerModel,
} from '@/models/cms-content.models';
import {
  ContactInfoModel,
  CurrencyConfigModel,
  EmailTemplateModel,
  NewsletterTemplateModel,
  ShippingZoneModel,
  SocialLinkModel,
  TaxConfigModel,
} from '@/models/settings.models';
import * as schemas from '@/schemas/cms.schema';
import { categoryService } from '@/services/category.service';
import { pageService } from '@/services/page.service';
import { blogService } from '@/services/blog.service';
import { settingsService } from '@/services/settings.service';
import { actorFromRequest } from '@/services/cms-crud.service';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { storeSettingUpsertSchema } from '@/schemas/cms.schema';
import { singleImageUpload } from '@/utils/file-upload.helper';
import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common.schema';

const P = PERMISSIONS;
const categoryIdParams = z.object({ id: objectIdSchema });

export const cmsRouter = Router();

/** Master data */
cmsRouter.get(
  '/categories/tree',
  authenticate,
  authorizeAny(P.CATEGORIES_VIEW, P.CATEGORIES_MANAGE, P.CATEGORIES_READ),
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await categoryService.tree());
  }),
);

cmsRouter.post(
  '/categories/:id/image',
  authenticate,
  authorizeAny(P.CATEGORIES_UPDATE, P.CATEGORIES_MANAGE),
  validate({ params: categoryIdParams }),
  singleImageUpload('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return ApiResponse.error(res, 'File is required', 400, 'FILE_REQUIRED');
    }
    const category = await categoryService.uploadImage(
      String(req.params.id),
      req.file,
      actorFromRequest(req),
      typeof req.body.alt === 'string' ? req.body.alt : undefined,
    );
    ApiResponse.success(res, category, 'Category image updated');
  }),
);

cmsRouter.use(
  '/categories',
  createCrudRouter({
    resource: 'categories',
    path: '/categories',
    model: CategoryModel as never,
    createSchema: schemas.categoryCreateSchema,
    updateSchema: schemas.categoryUpdateSchema,
    permissions: {
      view: [P.CATEGORIES_VIEW, P.CATEGORIES_MANAGE, P.CATEGORIES_READ],
      create: [P.CATEGORIES_CREATE, P.CATEGORIES_MANAGE],
      update: [P.CATEGORIES_UPDATE, P.CATEGORIES_MANAGE],
      delete: [P.CATEGORIES_DELETE, P.CATEGORIES_MANAGE],
    },
    service: categoryService as never,
  }),
);

cmsRouter.use(
  '/brands',
  createCrudRouter({
    resource: 'brands',
    path: '/brands',
    model: BrandModel as never,
    createSchema: schemas.brandCreateSchema,
    updateSchema: schemas.brandUpdateSchema,
    permissions: {
      view: [P.BRANDS_VIEW, P.BRANDS_MANAGE, P.BRANDS_READ],
      create: [P.BRANDS_CREATE, P.BRANDS_MANAGE],
      update: [P.BRANDS_UPDATE, P.BRANDS_MANAGE],
      delete: [P.BRANDS_DELETE, P.BRANDS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/collections',
  createCrudRouter({
    resource: 'collections',
    path: '/collections',
    model: CollectionModel as never,
    createSchema: schemas.collectionCreateSchema,
    updateSchema: schemas.collectionUpdateSchema,
    permissions: {
      view: [P.COLLECTIONS_VIEW, P.COLLECTIONS_MANAGE, P.COLLECTIONS_READ],
      create: [P.COLLECTIONS_CREATE, P.COLLECTIONS_MANAGE],
      update: [P.COLLECTIONS_UPDATE, P.COLLECTIONS_MANAGE],
      delete: [P.COLLECTIONS_DELETE, P.COLLECTIONS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/colors',
  createCrudRouter({
    resource: 'colors',
    path: '/colors',
    model: ColorModel as never,
    createSchema: schemas.colorCreateSchema,
    updateSchema: schemas.colorUpdateSchema,
    permissions: {
      view: [P.COLORS_VIEW, P.COLORS_MANAGE],
      create: P.COLORS_MANAGE,
      update: P.COLORS_MANAGE,
      delete: P.COLORS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/sizes',
  createCrudRouter({
    resource: 'sizes',
    path: '/sizes',
    model: SizeModel as never,
    createSchema: schemas.sizeCreateSchema,
    updateSchema: schemas.sizeUpdateSchema,
    permissions: {
      view: [P.SIZES_VIEW, P.SIZES_MANAGE],
      create: P.SIZES_MANAGE,
      update: P.SIZES_MANAGE,
      delete: P.SIZES_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/materials',
  createCrudRouter({
    resource: 'materials',
    path: '/materials',
    model: MaterialModel as never,
    createSchema: schemas.materialCreateSchema,
    updateSchema: schemas.materialUpdateSchema,
    permissions: {
      view: [P.MATERIALS_VIEW, P.MATERIALS_MANAGE],
      create: P.MATERIALS_MANAGE,
      update: P.MATERIALS_MANAGE,
      delete: P.MATERIALS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/tags',
  createCrudRouter({
    resource: 'tags',
    path: '/tags',
    model: ProductTagModel as never,
    createSchema: schemas.tagCreateSchema,
    updateSchema: schemas.tagUpdateSchema,
    permissions: {
      view: [P.TAGS_VIEW, P.TAGS_MANAGE],
      create: P.TAGS_MANAGE,
      update: P.TAGS_MANAGE,
      delete: P.TAGS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/occasions',
  createCrudRouter({
    resource: 'occasions',
    path: '/occasions',
    model: OccasionModel as never,
    createSchema: schemas.occasionCreateSchema,
    updateSchema: schemas.occasionUpdateSchema,
    permissions: {
      view: [P.OCCASIONS_VIEW, P.OCCASIONS_MANAGE],
      create: P.OCCASIONS_MANAGE,
      update: P.OCCASIONS_MANAGE,
      delete: P.OCCASIONS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/season-collections',
  createCrudRouter({
    resource: 'seasons',
    path: '/season-collections',
    model: SeasonCollectionModel as never,
    createSchema: schemas.seasonCreateSchema,
    updateSchema: schemas.seasonUpdateSchema,
    permissions: {
      view: [P.SEASONS_VIEW, P.SEASONS_MANAGE],
      create: P.SEASONS_MANAGE,
      update: P.SEASONS_MANAGE,
      delete: P.SEASONS_MANAGE,
    },
  }),
);

/** CMS content */
cmsRouter.use(
  '/hero-banners',
  createCrudRouter({
    resource: 'hero_banners',
    path: '/hero-banners',
    model: HeroBannerModel as never,
    createSchema: schemas.heroBannerCreateSchema,
    updateSchema: schemas.heroBannerUpdateSchema,
    searchFields: ['title', 'subtitle'],
    sortableFields: ['priority', 'createdAt', 'startsAt'],
    permissions: {
      view: [P.BANNERS_VIEW, P.BANNERS_MANAGE, P.CMS_MANAGE],
      create: [P.BANNERS_MANAGE, P.CMS_MANAGE],
      update: [P.BANNERS_MANAGE, P.CMS_MANAGE],
      delete: [P.BANNERS_MANAGE, P.CMS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/promo-banners',
  createCrudRouter({
    resource: 'promo_banners',
    path: '/promo-banners',
    model: PromoBannerModel as never,
    createSchema: schemas.promoBannerCreateSchema,
    updateSchema: schemas.promoBannerUpdateSchema,
    searchFields: ['title', 'subtitle', 'placement'],
    sortableFields: ['priority', 'createdAt'],
    permissions: {
      view: [P.BANNERS_VIEW, P.BANNERS_MANAGE, P.MARKETING_MANAGE],
      create: [P.BANNERS_MANAGE, P.MARKETING_MANAGE],
      update: [P.BANNERS_MANAGE, P.MARKETING_MANAGE],
      delete: [P.BANNERS_MANAGE, P.MARKETING_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/announcements',
  createCrudRouter({
    resource: 'announcements',
    path: '/announcements',
    model: AnnouncementBarModel as never,
    createSchema: schemas.announcementCreateSchema,
    updateSchema: schemas.announcementUpdateSchema,
    searchFields: ['message'],
    sortableFields: ['priority', 'createdAt'],
    permissions: {
      view: [P.MARKETING_VIEW, P.MARKETING_MANAGE, P.CMS_MANAGE],
      create: [P.MARKETING_MANAGE, P.CMS_MANAGE],
      update: [P.MARKETING_MANAGE, P.CMS_MANAGE],
      delete: [P.MARKETING_MANAGE, P.CMS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/home-sections',
  createCrudRouter({
    resource: 'home_sections',
    path: '/home-sections',
    model: HomeSectionModel as never,
    createSchema: schemas.homeSectionCreateSchema,
    updateSchema: schemas.homeSectionUpdateSchema,
    searchFields: ['key', 'title'],
    sortableFields: ['sortOrder', 'createdAt'],
    permissions: {
      view: [P.CMS_VIEW, P.CMS_MANAGE],
      create: P.CMS_MANAGE,
      update: P.CMS_MANAGE,
      delete: P.CMS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/faqs',
  createCrudRouter({
    resource: 'faqs',
    path: '/faqs',
    model: FaqModel as never,
    createSchema: schemas.faqCreateSchema,
    updateSchema: schemas.faqUpdateSchema,
    searchFields: ['question', 'answer', 'category'],
    permissions: {
      view: [P.FAQS_VIEW, P.FAQS_MANAGE, P.CMS_MANAGE],
      create: [P.FAQS_MANAGE, P.CMS_MANAGE],
      update: [P.FAQS_MANAGE, P.CMS_MANAGE],
      delete: [P.FAQS_MANAGE, P.CMS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/pages',
  createCrudRouter({
    resource: 'pages',
    path: '/pages',
    model: CmsPageModel as never,
    createSchema: schemas.pageCreateSchema,
    updateSchema: schemas.pageUpdateSchema,
    service: pageService as never,
    permissions: {
      view: [P.PAGES_VIEW, P.PAGES_MANAGE, P.CMS_MANAGE],
      create: [P.PAGES_MANAGE, P.CMS_MANAGE],
      update: [P.PAGES_MANAGE, P.CMS_MANAGE],
      delete: [P.PAGES_MANAGE, P.CMS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/blog-categories',
  createCrudRouter({
    resource: 'blog_categories',
    path: '/blog-categories',
    model: BlogCategoryModel as never,
    createSchema: schemas.blogCategoryCreateSchema,
    updateSchema: schemas.blogCategoryUpdateSchema,
    permissions: {
      view: [P.BLOGS_VIEW, P.BLOGS_MANAGE],
      create: P.BLOGS_MANAGE,
      update: P.BLOGS_MANAGE,
      delete: P.BLOGS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/blogs',
  (() => {
    const r = createCrudRouter({
      resource: 'blogs',
      path: '/blogs',
      model: BlogPostModel as never,
      createSchema: schemas.blogCreateSchema,
      updateSchema: schemas.blogUpdateSchema,
      service: blogService as never,
      permissions: {
        view: [P.BLOGS_VIEW, P.BLOGS_MANAGE],
        create: P.BLOGS_MANAGE,
        update: P.BLOGS_MANAGE,
        delete: P.BLOGS_MANAGE,
      },
    });

    r.post(
      '/:id/publish',
      authenticate,
      authorizeAny(P.BLOGS_PUBLISH, P.BLOGS_MANAGE),
      validate({ params: z.object({ id: objectIdSchema }) }),
      asyncHandler(async (req, res) => {
        const doc = await blogService.publish(String(req.params.id), actorFromRequest(req));
        ApiResponse.success(res, doc, 'Published');
      }),
    );

    r.post(
      '/:id/schedule',
      authenticate,
      authorizeAny(P.BLOGS_PUBLISH, P.BLOGS_MANAGE),
      validate({
        params: z.object({ id: objectIdSchema }),
        body: z.object({ publishAt: z.coerce.date() }),
      }),
      asyncHandler(async (req, res) => {
        const doc = await blogService.schedule(
          String(req.params.id),
          req.body.publishAt,
          actorFromRequest(req),
        );
        ApiResponse.success(res, doc, 'Scheduled');
      }),
    );

    return r;
  })(),
);

/** Settings & config */
cmsRouter.use(
  '/contact-infos',
  createCrudRouter({
    resource: 'contact_infos',
    path: '/contact-infos',
    model: ContactInfoModel as never,
    createSchema: schemas.contactInfoCreateSchema,
    updateSchema: schemas.contactInfoUpdateSchema,
    searchFields: ['label', 'value', 'type'],
    permissions: {
      view: [P.SETTINGS_VIEW, P.SETTINGS_READ, P.SETTINGS_MANAGE, P.CMS_MANAGE],
      create: P.SETTINGS_MANAGE,
      update: P.SETTINGS_MANAGE,
      delete: P.SETTINGS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/social-links',
  createCrudRouter({
    resource: 'social_links',
    path: '/social-links',
    model: SocialLinkModel as never,
    createSchema: schemas.socialLinkCreateSchema,
    updateSchema: schemas.socialLinkUpdateSchema,
    searchFields: ['platform', 'url'],
    permissions: {
      view: [P.SETTINGS_VIEW, P.SETTINGS_READ, P.SETTINGS_MANAGE],
      create: P.SETTINGS_MANAGE,
      update: P.SETTINGS_MANAGE,
      delete: P.SETTINGS_MANAGE,
    },
  }),
);

cmsRouter.use(
  '/shipping-zones',
  createCrudRouter({
    resource: 'shipping_zones',
    path: '/shipping-zones',
    model: ShippingZoneModel as never,
    createSchema: schemas.shippingZoneCreateSchema,
    updateSchema: schemas.shippingZoneUpdateSchema,
    searchFields: ['name', 'countries', 'regions'],
    permissions: {
      view: [P.SHIPPING_VIEW, P.SHIPPING_MANAGE, P.SETTINGS_MANAGE],
      create: [P.SHIPPING_MANAGE, P.SETTINGS_MANAGE],
      update: [P.SHIPPING_MANAGE, P.SETTINGS_MANAGE],
      delete: [P.SHIPPING_MANAGE, P.SETTINGS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/tax-configs',
  createCrudRouter({
    resource: 'tax_configs',
    path: '/tax-configs',
    model: TaxConfigModel as never,
    createSchema: schemas.taxConfigCreateSchema,
    updateSchema: schemas.taxConfigUpdateSchema,
    searchFields: ['name', 'code', 'country'],
    permissions: {
      view: [P.TAX_VIEW, P.TAX_MANAGE, P.SETTINGS_MANAGE],
      create: [P.TAX_MANAGE, P.SETTINGS_MANAGE],
      update: [P.TAX_MANAGE, P.SETTINGS_MANAGE],
      delete: [P.TAX_MANAGE, P.SETTINGS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/currencies',
  createCrudRouter({
    resource: 'currencies',
    path: '/currencies',
    model: CurrencyConfigModel as never,
    createSchema: schemas.currencyCreateSchema,
    updateSchema: schemas.currencyUpdateSchema,
    searchFields: ['code', 'name', 'symbol'],
    permissions: {
      view: [P.CURRENCY_VIEW, P.CURRENCY_MANAGE, P.SETTINGS_MANAGE],
      create: [P.CURRENCY_MANAGE, P.SETTINGS_MANAGE],
      update: [P.CURRENCY_MANAGE, P.SETTINGS_MANAGE],
      delete: [P.CURRENCY_MANAGE, P.SETTINGS_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/newsletter-templates',
  createCrudRouter({
    resource: 'newsletter_templates',
    path: '/newsletter-templates',
    model: NewsletterTemplateModel as never,
    createSchema: schemas.newsletterTemplateCreateSchema,
    updateSchema: schemas.newsletterTemplateUpdateSchema,
    searchFields: ['name', 'subject'],
    permissions: {
      view: [P.TEMPLATES_VIEW, P.TEMPLATES_MANAGE, P.MARKETING_MANAGE],
      create: [P.TEMPLATES_MANAGE, P.MARKETING_MANAGE],
      update: [P.TEMPLATES_MANAGE, P.MARKETING_MANAGE],
      delete: [P.TEMPLATES_MANAGE, P.MARKETING_MANAGE],
    },
  }),
);

cmsRouter.use(
  '/email-templates',
  createCrudRouter({
    resource: 'email_templates',
    path: '/email-templates',
    model: EmailTemplateModel as never,
    createSchema: schemas.emailTemplateCreateSchema,
    updateSchema: schemas.emailTemplateUpdateSchema,
    searchFields: ['key', 'name', 'subject'],
    permissions: {
      view: [P.TEMPLATES_VIEW, P.TEMPLATES_MANAGE, P.SETTINGS_MANAGE],
      create: [P.TEMPLATES_MANAGE, P.SETTINGS_MANAGE],
      update: [P.TEMPLATES_MANAGE, P.SETTINGS_MANAGE],
      delete: [P.TEMPLATES_MANAGE, P.SETTINGS_MANAGE],
    },
  }),
);

/** Global settings key/value */
cmsRouter.get(
  '/settings/public',
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await settingsService.getPublic());
  }),
);

const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get(
  '/',
  authorizeAny(P.SETTINGS_VIEW, P.SETTINGS_READ, P.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const group = typeof req.query.group === 'string' ? req.query.group : undefined;
    const data = await settingsService.list(group, false);
    ApiResponse.success(res, data);
  }),
);

settingsRouter.put(
  '/',
  authorizeAny(P.SETTINGS_MANAGE),
  validate({ body: storeSettingUpsertSchema }),
  asyncHandler(async (req, res) => {
    const doc = await settingsService.upsert(req.body, actorFromRequest(req));
    ApiResponse.success(res, doc, 'Setting saved');
  }),
);

settingsRouter.delete(
  '/:key',
  authorizeAny(P.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const result = await settingsService.remove(String(req.params.key), actorFromRequest(req));
    ApiResponse.success(res, result, 'Setting deleted');
  }),
);

cmsRouter.use('/settings', settingsRouter);
