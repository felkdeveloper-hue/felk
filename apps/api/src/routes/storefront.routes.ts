import { Router } from 'express';
import type { Model } from 'mongoose';
import {
  AnnouncementBarModel,
  BrandModel,
  CategoryModel,
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
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';

export const storefrontRouter = Router();

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
      ApiResponse.success(res, result.data, 'OK', 200, result.meta);
    }),
  );
}

storefrontRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const result = await productService.list({
      ...req.query,
      status: 'active',
      visibility: 'public',
      includeDeleted: false,
    } as never);
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
    if (record.status !== 'active' || record.visibility !== 'public') {
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
