import { Router, type Response } from 'express';
import type { Model } from 'mongoose';
import {
  AnnouncementBarModel,
  BrandModel,
  CategoryModel,
  CmsPageModel,
  CollectionModel,
  ColorModel,
  ContactInfoModel,
  FaqModel,
  HeroBannerModel,
  HomeSectionModel,
  MaterialModel,
  OccasionModel,
  ProductMediaModel,
  ProductRelationshipModel,
  ProductVariantModel,
  PromoBannerModel,
  SizeModel,
  SocialLinkModel,
} from '@/models';
import { productService } from '@/services/product.service';
import { CmsCrudService } from '@/services/cms-crud.service';
import { settingsService } from '@/services/settings.service';
import { PRODUCT_STATUS, PRODUCT_VISIBILITY } from '@/constants/product';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import { getCached, setCache } from '@/utils/simple-cache';

export const storefrontRouter = Router();

const PUBLIC_CACHE_MAX_AGE = 300;

function setPublicCache(res: Response, maxAge = PUBLIC_CACHE_MAX_AGE): void {
  if (process.env.NODE_ENV !== 'production') {
    res.set('Cache-Control', 'no-store');
    return;
  }
  res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
}

function publicList(path: string, resource: string, model: Model<any>, status = 'active') {
  const service = new CmsCrudService(resource, model);
  storefrontRouter.get(
    path,
    asyncHandler(async (req, res) => {
      const result = await service.list({
        ...req.query,
        includeDeleted: false,
        status,
      } as never);
      setPublicCache(res);
      ApiResponse.success(res, result.data, 'OK', 200, result.meta);
    }),
  );
}

const BOOTSTRAP_CACHE_KEY = 'storefront:bootstrap';

storefrontRouter.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    const skipCache = process.env.NODE_ENV !== 'production';
    if (!skipCache) {
      const cached = getCached<Record<string, unknown>>(BOOTSTRAP_CACHE_KEY);
      if (cached) {
        setPublicCache(res);
        return ApiResponse.success(res, cached);
      }
    }

    const categoryService = new CmsCrudService('categories', CategoryModel as Model<any>);
    const heroService = new CmsCrudService('hero-banners', HeroBannerModel as Model<any>);
    const sectionService = new CmsCrudService('home-sections', HomeSectionModel as Model<any>);
    const announcementService = new CmsCrudService(
      'announcements',
      AnnouncementBarModel as Model<any>,
    );
    const socialService = new CmsCrudService('social-links', SocialLinkModel as Model<any>);
    const contactService = new CmsCrudService('contact-infos', ContactInfoModel as Model<any>);
    const pageService = new CmsCrudService('pages', CmsPageModel as Model<any>);

    const listBase = { includeDeleted: false, status: 'active' as const, limit: 100 };
    const pageBase = { includeDeleted: false, status: 'published' as const, limit: 100 };

    const [
      settings,
      categories,
      heroBanners,
      homeSections,
      announcements,
      socialLinks,
      contactInfos,
      pages,
    ] = await Promise.all([
      settingsService.getPublic(),
      categoryService.list({ ...listBase, sortBy: 'sortOrder', sortOrder: 'asc' } as never),
      heroService.list({ ...listBase, limit: 10, sortBy: 'priority', sortOrder: 'desc' } as never),
      sectionService.list({
        ...listBase,
        limit: 50,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      } as never),
      announcementService.list({
        ...listBase,
        limit: 5,
        sortBy: 'priority',
        sortOrder: 'desc',
      } as never),
      socialService.list({
        ...listBase,
        limit: 20,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      } as never),
      contactService.list({
        ...listBase,
        limit: 20,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      } as never),
      pageService.list(pageBase as never),
    ]);

    const payload = {
      settings,
      categories: categories.data,
      heroBanners: heroBanners.data,
      homeSections: homeSections.data,
      announcements: announcements.data,
      socialLinks: socialLinks.data,
      contactInfos: contactInfos.data,
      pages: pages.data,
    };

    if (!skipCache) {
      setCache(BOOTSTRAP_CACHE_KEY, payload);
    }
    setPublicCache(res);
    ApiResponse.success(res, payload);
  }),
);

storefrontRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { status: _status, visibility: _visibility, ...query } = req.query;
    const cacheKey = `storefront:products:${JSON.stringify(query)}`;
    const skipCache = process.env.NODE_ENV !== 'production';

    if (!skipCache) {
      const cached = getCached<{ data: unknown; meta: unknown }>(cacheKey);
      if (cached) {
        setPublicCache(res, 120);
        return ApiResponse.success(res, cached.data, 'OK', 200, cached.meta as never);
      }
    }

    const result = await productService.list({
      ...query,
      includeDeleted: false,
      excludeStatuses: [
        PRODUCT_STATUS.DRAFT,
        PRODUCT_STATUS.ARCHIVED,
        PRODUCT_STATUS.DISCONTINUED,
        PRODUCT_STATUS.HIDDEN,
        PRODUCT_STATUS.SCHEDULED,
      ],
      excludeVisibility: [PRODUCT_VISIBILITY.HIDDEN],
    } as never);

    if (!skipCache) {
      setCache(cacheKey, { data: result.data, meta: result.meta }, 60_000);
    }

    setPublicCache(res, 120);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

storefrontRouter.get(
  '/products/:productId/variants',
  asyncHandler(async (req, res) => {
    const rows = await ProductVariantModel.find({
      productId: req.params.productId,
      status: 'active',
      isDeleted: false,
    })
      .sort({ displayOrder: 1 })
      .lean();
    ApiResponse.success(res, rows);
  }),
);

storefrontRouter.get(
  '/products/:productId/media',
  asyncHandler(async (req, res) => {
    const rows = await ProductMediaModel.find({
      productId: req.params.productId,
      isDeleted: false,
    })
      .sort({ priority: 1 })
      .lean();
    ApiResponse.success(res, rows);
  }),
);

storefrontRouter.get(
  '/products/:productId/relationships',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {
      productId: req.params.productId,
      isDeleted: false,
    };
    if (typeof req.query.type === 'string') filter.type = req.query.type;
    const rows = await ProductRelationshipModel.find(filter).sort({ sortOrder: 1 }).lean();
    ApiResponse.success(res, rows);
  }),
);

storefrontRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await productService.getById(String(req.params.id));
    const record = product as unknown as Record<string, unknown>;
    const status = String(record.status ?? '');
    const visibility = String(record.visibility ?? '');
    const hiddenStatuses = new Set<string>([
      PRODUCT_STATUS.DRAFT,
      PRODUCT_STATUS.ARCHIVED,
      PRODUCT_STATUS.DISCONTINUED,
      PRODUCT_STATUS.HIDDEN,
      PRODUCT_STATUS.SCHEDULED,
    ]);
    if (hiddenStatuses.has(status) || visibility === PRODUCT_VISIBILITY.HIDDEN) {
      throw ApiError.notFound('Product not found');
    }
    ApiResponse.success(res, product);
  }),
);

publicList('/categories', 'categories', CategoryModel as Model<any>);
publicList('/brands', 'brands', BrandModel as Model<any>);
publicList('/collections', 'collections', CollectionModel as Model<any>);
publicList('/colors', 'colors', ColorModel as Model<any>);
publicList('/sizes', 'sizes', SizeModel as Model<any>);
publicList('/materials', 'materials', MaterialModel as Model<any>);
publicList('/occasions', 'occasions', OccasionModel as Model<any>);
publicList('/faqs', 'faqs', FaqModel as Model<any>);
publicList('/hero-banners', 'hero-banners', HeroBannerModel as Model<any>);
publicList('/promo-banners', 'promo-banners', PromoBannerModel as Model<any>);
publicList('/announcements', 'announcements', AnnouncementBarModel as Model<any>);
publicList('/home-sections', 'home-sections', HomeSectionModel as Model<any>);
publicList('/social-links', 'social-links', SocialLinkModel as Model<any>);
publicList('/contact-infos', 'contact-infos', ContactInfoModel as Model<any>);
publicList('/pages', 'pages', CmsPageModel as Model<any>, 'published');
