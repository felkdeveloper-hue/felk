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
  NavigationMenuModel,
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
import { getCached, setCache, storefrontProductsCacheKey } from '@/utils/simple-cache';

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
    const cacheKey = storefrontProductsCacheKey(query as Record<string, unknown>);
    // Always cache briefly — Render cold starts hurt without it, and list payloads are public.
    const cached = getCached<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      setPublicCache(res, 300);
      return ApiResponse.success(res, cached.data, 'OK', 200, cached.meta as never);
    }

    const result = await productService.list({
      ...query,
      includeDeleted: false,
      // Keep sold-out products visible on the catalog (Sold out badge).
      excludeStatuses: [
        PRODUCT_STATUS.DRAFT,
        PRODUCT_STATUS.ARCHIVED,
        PRODUCT_STATUS.DISCONTINUED,
        PRODUCT_STATUS.HIDDEN,
        PRODUCT_STATUS.SCHEDULED,
      ],
      excludeVisibility: [PRODUCT_VISIBILITY.HIDDEN],
    } as never);

    setCache(cacheKey, { data: result.data, meta: result.meta }, 300_000);
    setPublicCache(res, 300);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

/** Lightweight keep-warm for hosting platforms that sleep idle dynos (e.g. Render). */
storefrontRouter.get(
  '/warmup',
  asyncHandler(async (_req, res) => {
    const warmQueries = [
      { gender: 'women', page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' },
      { page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' },
    ] as const;

    await Promise.all(
      warmQueries.map(async (query) => {
        const cacheKey = storefrontProductsCacheKey(query as unknown as Record<string, unknown>);
        if (getCached(cacheKey)) return;
        const result = await productService.list({
          ...query,
          includeDeleted: false,
          status: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK],
          excludeVisibility: [PRODUCT_VISIBILITY.HIDDEN],
        } as never);
        setCache(cacheKey, { data: result.data, meta: result.meta }, 300_000);
      }),
    );

    res.set('Cache-Control', 'no-store');
    ApiResponse.success(res, { ok: true });
  }),
);

storefrontRouter.get(
  '/products/by-slug/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug ?? '').trim();
    if (!slug) throw ApiError.notFound('Product not found');

    const cacheKey = `storefront:product:slug:${slug}`;
    const skipCache = process.env.NODE_ENV !== 'production';

    if (!skipCache) {
      const cached = getCached<Record<string, unknown>>(cacheKey);
      if (cached) {
        setPublicCache(res, 120);
        return ApiResponse.success(res, cached);
      }
    }

    const product = await productService.getBySlug(slug);
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

    if (!skipCache) {
      setCache(cacheKey, record, 60_000);
      const id = String(record.id ?? record._id ?? '');
      if (id) setCache(`storefront:product:${id}`, record, 60_000);
    }
    setPublicCache(res, 120);
    ApiResponse.success(res, product);
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

    const { InventoryItemModel } = await import('@/models/inventory.models');
    const items = rows.length
      ? await InventoryItemModel.find({
          variantId: { $in: rows.map((r) => r._id) },
          isDeleted: false,
        })
          .select('variantId available')
          .lean()
      : [];
    const stockMap = new Map<string, number>();
    for (const item of items) {
      const vid = String(item.variantId);
      stockMap.set(vid, (stockMap.get(vid) ?? 0) + Number(item.available ?? 0));
    }

    const withStock = rows.map((row) => {
      const id = String(row._id);
      if (!stockMap.has(id)) return row;
      return { ...row, stock: stockMap.get(id) ?? 0 };
    });

    ApiResponse.success(res, withStock);
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
    const id = String(req.params.id);
    const cacheKey = `storefront:product:${id}`;
    const skipCache = process.env.NODE_ENV !== 'production';

    if (!skipCache) {
      const cached = getCached<Record<string, unknown>>(cacheKey);
      if (cached) {
        setPublicCache(res, 120);
        return ApiResponse.success(res, cached);
      }
    }

    const product = await productService.getById(id);
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

    if (!skipCache) {
      setCache(cacheKey, record, 60_000);
    }
    setPublicCache(res, 120);
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

storefrontRouter.get(
  '/navigation-menus/:key',
  asyncHandler(async (req, res) => {
    setPublicCache(res);
    const key = String(req.params.key).trim().toLowerCase();
    const doc = await NavigationMenuModel.findOne({
      key,
      status: 'active',
      isDeleted: false,
    }).lean();
    if (!doc) {
      throw ApiError.notFound('Navigation menu not found');
    }
    ApiResponse.success(res, {
      id: String(doc._id),
      key: doc.key,
      label: doc.label,
      gender: doc.gender,
      columns: doc.columns ?? [],
      specials: doc.specials ?? [],
      featured: doc.featured ?? [],
      status: doc.status,
    });
  }),
);
