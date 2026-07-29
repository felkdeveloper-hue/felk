import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '@/constants/permissions.js';
import { authenticate, authorizeAny, validate } from '@/middlewares/index.js';
import { actorFromRequest } from '@/services/cms-crud.service.js';
import { productService } from '@/services/product.service.js';
import { productVariantService } from '@/services/product-variant.service.js';
import { productImportService } from '@/services/product-import.service.js';
import { productExportService } from '@/services/product-export.service.js';
import { productMediaService } from '@/services/product-media.service.js';
import { productRelationshipService } from '@/services/product-relationship.service.js';
import {
  productAttributeService,
  attributeValueService,
} from '@/services/product-attribute.service.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import {
  multiImageUpload,
  productImportPreviewUpload,
  productImportZipOnlyUpload,
  singleImageUpload,
} from '@/utils/file-upload.helper.js';
import { unlink } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { cmsListQuerySchema } from '@/schemas/cms.shared.schema.js';
import { productImportSchema } from '@/schemas/product-import.schema.js';
import * as S from '@/schemas/product.schema.js';
import type { RelationshipType } from '@/constants/product.js';

const P = PERMISSIONS;

const viewPerms = [P.PRODUCTS_VIEW, P.PRODUCTS_READ] as const;
const createPerms = [P.PRODUCTS_CREATE] as const;
const updatePerms = [P.PRODUCTS_UPDATE] as const;
const deletePerms = [P.PRODUCTS_DELETE] as const;
const publishPerms = [P.PRODUCTS_PUBLISH] as const;
const exportPerms = [P.PRODUCTS_EXPORT, P.PRODUCTS_VIEW, P.PRODUCTS_READ] as const;
// Bulk import is product creation in bulk, so either permission unlocks it.
const importPerms = [P.PRODUCTS_IMPORT, P.PRODUCTS_CREATE] as const;
const attrView = [P.ATTRIBUTES_VIEW, P.ATTRIBUTES_MANAGE] as const;
const attrManage = [P.ATTRIBUTES_MANAGE] as const;

export const catalogRouter = Router();

catalogRouter.use(authenticate);

/* -------------------------------------------------------------------------- */
/* Attributes                                                                  */
/* -------------------------------------------------------------------------- */

catalogRouter.get(
  '/attributes',
  authorizeAny(...attrView),
  validate({ query: cmsListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await productAttributeService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

catalogRouter.post(
  '/attributes',
  authorizeAny(...attrManage),
  validate({ body: S.attributeCreateSchema }),
  asyncHandler(async (req, res) => {
    const doc = await productAttributeService.create(req.body, actorFromRequest(req));
    ApiResponse.created(res, doc);
  }),
);

catalogRouter.get(
  '/attributes/:id',
  authorizeAny(...attrView),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await productAttributeService.getById(String(req.params.id)));
  }),
);

catalogRouter.patch(
  '/attributes/:id',
  authorizeAny(...attrManage),
  validate({ params: S.idParamsSchema, body: S.attributeUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productAttributeService.update(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

catalogRouter.delete(
  '/attributes/:id',
  authorizeAny(...attrManage),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productAttributeService.remove(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

catalogRouter.get(
  '/attributes/:attributeId/values',
  authorizeAny(...attrView),
  validate({ params: S.attributeIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await attributeValueService.listByAttribute(String(req.params.attributeId)),
    );
  }),
);

catalogRouter.post(
  '/attributes/:attributeId/values',
  authorizeAny(...attrManage),
  validate({ params: S.attributeIdParamsSchema, body: S.attributeValueCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await attributeValueService.create(
        String(req.params.attributeId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

catalogRouter.patch(
  '/attribute-values/:valueId',
  authorizeAny(...attrManage),
  validate({ params: S.valueIdParamsSchema, body: S.attributeValueUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await attributeValueService.update(
        String(req.params.valueId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

catalogRouter.delete(
  '/attribute-values/:valueId',
  authorizeAny(...attrManage),
  validate({ params: S.valueIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await attributeValueService.remove(String(req.params.valueId), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Products — bulk / special before :id                                        */
/* -------------------------------------------------------------------------- */

catalogRouter.get(
  '/products',
  authorizeAny(...viewPerms),
  validate({ query: S.productListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await productService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

catalogRouter.get(
  '/products/export',
  authorizeAny(...exportPerms),
  asyncHandler(async (req, res) => {
    const format = String(req.query.format ?? 'xlsx');
    if (format === 'json') {
      const result = await productService.exportAll(req.query as never);
      return ApiResponse.success(res, result.data, 'Export ready', 200, result.meta);
    }
    const buffer = await productExportService.exportWorkbook(req.query as never);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="felk-products-export.xlsx"');
    res.send(buffer);
  }),
);

catalogRouter.get(
  '/products/import/template',
  authorizeAny(...importPerms),
  asyncHandler(async (_req, res) => {
    const workbook = await productImportService.buildTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="felk-product-import-template.xlsx"',
    );
    res.send(workbook);
  }),
);

catalogRouter.get(
  '/products/import/template.csv',
  authorizeAny(...importPerms),
  asyncHandler(async (_req, res) => {
    const csv = productImportService.buildCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="felk-product-import-template.csv"');
    res.send(csv);
  }),
);

catalogRouter.get(
  '/products/import/sample-images.zip',
  authorizeAny(...importPerms),
  asyncHandler(async (_req, res) => {
    const zip = await productImportService.buildSampleImagesZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="felk-product-import-sample-images.zip"',
    );
    res.send(zip);
  }),
);

catalogRouter.post(
  '/products/import/preview',
  authorizeAny(...importPerms),
  ...productImportPreviewUpload(),
  asyncHandler(async (req, res) => {
    const uploaded = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const sheet = uploaded?.file?.[0];
    const imagesZip = uploaded?.imagesZip?.[0];
    if (!sheet) {
      return ApiResponse.error(res, 'File is required', 400, 'FILE_REQUIRED');
    }
    try {
      ApiResponse.success(res, await productImportService.preview(sheet, imagesZip));
    } finally {
      for (const file of [sheet, imagesZip]) {
        if (file?.path) void unlink(file.path).catch(() => undefined);
      }
    }
  }),
);

catalogRouter.post(
  '/products/import',
  authorizeAny(...importPerms),
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = String(req.headers['content-type'] ?? '');
    if (!contentType.includes('multipart/form-data')) {
      next();
      return;
    }
    productImportZipOnlyUpload.single('imagesZip')(req, res, (err: unknown) => {
      if (err) {
        next(err);
        return;
      }
      try {
        if (typeof req.body.products === 'string') {
          req.body.products = JSON.parse(req.body.products);
        }
        if (typeof req.body.publish === 'string') {
          req.body.publish = req.body.publish === 'true';
        }
        if (typeof req.body.imagesSessionId === 'string' && !req.body.imagesSessionId.trim()) {
          delete req.body.imagesSessionId;
        }
      } catch {
        ApiResponse.error(res, 'Invalid products payload', 400, 'INVALID_PAYLOAD');
        return;
      }
      next();
    });
  },
  validate({ body: productImportSchema }),
  asyncHandler(async (req, res) => {
    try {
      ApiResponse.success(
        res,
        await productImportService.importProducts(req.body.products, actorFromRequest(req), {
          publish: req.body.publish === true,
          imagesSessionId: req.body.imagesSessionId,
          imagesZip: req.file,
        }),
        'Import batch complete',
      );
    } finally {
      if (req.file?.path) void unlink(req.file.path).catch(() => undefined);
    }
  }),
);

catalogRouter.post(
  '/products/bulk',
  authorizeAny(...createPerms),
  validate({ body: S.bulkProductCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productService.bulkCreate(req.body.items, actorFromRequest(req)),
    );
  }),
);

catalogRouter.patch(
  '/products/bulk',
  authorizeAny(...updatePerms),
  validate({ body: S.bulkProductUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.bulkUpdate(req.body.updates, actorFromRequest(req)),
      'Bulk update complete',
    );
  }),
);

catalogRouter.post(
  '/products/bulk-delete',
  authorizeAny(...deletePerms),
  validate({ body: S.bulkIdsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.bulkDelete(req.body.ids, actorFromRequest(req)),
      'Bulk delete complete',
    );
  }),
);

catalogRouter.post(
  '/products/bulk-status',
  authorizeAny(...updatePerms),
  validate({ body: S.productBulkStatusSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.bulkStatus(req.body.ids, req.body.status, actorFromRequest(req)),
      'Bulk status update complete',
    );
  }),
);

catalogRouter.post(
  '/products',
  authorizeAny(...createPerms),
  validate({ body: S.productCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await productService.create(req.body, actorFromRequest(req)));
  }),
);

catalogRouter.get(
  '/products/:id',
  authorizeAny(...viewPerms),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.getById(String(req.params.id), req.query.includeDeleted === 'true'),
    );
  }),
);

catalogRouter.patch(
  '/products/:id',
  authorizeAny(...updatePerms),
  validate({ params: S.idParamsSchema, body: S.productUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.update(String(req.params.id), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

catalogRouter.delete(
  '/products/:id',
  authorizeAny(...deletePerms),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.remove(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

catalogRouter.post(
  '/products/:id/restore',
  authorizeAny(...updatePerms),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.restore(String(req.params.id), actorFromRequest(req)),
      'Restored',
    );
  }),
);

catalogRouter.post(
  '/products/:id/publish',
  authorizeAny(...publishPerms),
  validate({ params: S.idParamsSchema, body: S.publishProductSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productService.publish(
        String(req.params.id),
        actorFromRequest(req),
        req.body.publishAt,
      ),
      'Published',
    );
  }),
);

catalogRouter.post(
  '/products/:id/duplicate',
  authorizeAny(...createPerms),
  validate({ params: S.idParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productService.duplicate(String(req.params.id), actorFromRequest(req)),
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Variants                                                                    */
/* -------------------------------------------------------------------------- */

catalogRouter.get(
  '/products/:productId/variants',
  authorizeAny(...viewPerms),
  validate({ params: S.productIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productVariantService.listByProduct(String(req.params.productId)),
    );
  }),
);

catalogRouter.post(
  '/products/:productId/variants',
  authorizeAny(...createPerms),
  validate({ params: S.productIdParamsSchema, body: S.variantCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productVariantService.create(
        String(req.params.productId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

catalogRouter.get(
  '/variants/:variantId',
  authorizeAny(...viewPerms),
  validate({ params: S.variantIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await productVariantService.getById(String(req.params.variantId)));
  }),
);

catalogRouter.patch(
  '/variants/:variantId',
  authorizeAny(...updatePerms),
  validate({ params: S.variantIdParamsSchema, body: S.variantUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productVariantService.update(
        String(req.params.variantId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

catalogRouter.delete(
  '/variants/:variantId',
  authorizeAny(...deletePerms),
  validate({ params: S.variantIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productVariantService.remove(String(req.params.variantId), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

catalogRouter.post(
  '/variants/:variantId/clone',
  authorizeAny(...createPerms),
  validate({ params: S.variantIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productVariantService.clone(String(req.params.variantId), actorFromRequest(req)),
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

catalogRouter.get(
  '/products/:productId/media',
  authorizeAny(...viewPerms),
  validate({ params: S.productIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await productMediaService.list(String(req.params.productId)));
  }),
);

catalogRouter.post(
  '/products/:productId/media',
  authorizeAny(...updatePerms),
  validate({ params: S.productIdParamsSchema, body: S.mediaRemoteCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productMediaService.createRemote(
        String(req.params.productId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

catalogRouter.post(
  '/products/:productId/media/upload',
  authorizeAny(...updatePerms),
  validate({ params: S.productIdParamsSchema }),
  singleImageUpload('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return ApiResponse.error(res, 'File is required', 400, 'FILE_REQUIRED');
    }
    const media = await productMediaService.uploadImage(
      String(req.params.productId),
      req.file,
      {
        alt: typeof req.body.alt === 'string' ? req.body.alt : undefined,
        priority: req.body.priority != null ? Number(req.body.priority) : undefined,
        isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true,
        isThumbnail: req.body.isThumbnail === 'true' || req.body.isThumbnail === true,
        isGallery: req.body.isGallery !== 'false' && req.body.isGallery !== false,
        variantId: req.body.variantId || null,
        type: typeof req.body.type === 'string' ? req.body.type : undefined,
      },
      actorFromRequest(req),
    );
    ApiResponse.created(res, media);
  }),
);

catalogRouter.post(
  '/products/:productId/media/upload-many',
  authorizeAny(...updatePerms),
  validate({ params: S.productIdParamsSchema }),
  multiImageUpload('files', 20),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return ApiResponse.error(res, 'Files are required', 400, 'FILES_REQUIRED');
    }
    const created = [];
    for (const [index, file] of files.entries()) {
      created.push(
        await productMediaService.uploadImage(
          String(req.params.productId),
          file,
          { priority: index, isGallery: true },
          actorFromRequest(req),
        ),
      );
    }
    ApiResponse.created(res, { count: created.length, items: created });
  }),
);

catalogRouter.patch(
  '/media/:mediaId',
  authorizeAny(...updatePerms),
  validate({ params: S.mediaIdParamsSchema, body: S.mediaUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productMediaService.update(String(req.params.mediaId), req.body, actorFromRequest(req)),
      'Updated',
    );
  }),
);

catalogRouter.delete(
  '/media/:mediaId',
  authorizeAny(...updatePerms),
  validate({ params: S.mediaIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productMediaService.remove(String(req.params.mediaId), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Relationships                                                               */
/* -------------------------------------------------------------------------- */

catalogRouter.get(
  '/products/:productId/relationships',
  authorizeAny(...viewPerms),
  validate({
    params: S.productIdParamsSchema,
    query: z.object({ type: z.string().optional() }),
  }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productRelationshipService.list(
        String(req.params.productId),
        typeof req.query.type === 'string' ? req.query.type : undefined,
      ),
    );
  }),
);

catalogRouter.post(
  '/products/:productId/relationships',
  authorizeAny(...updatePerms),
  validate({ params: S.productIdParamsSchema, body: S.relationshipCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await productRelationshipService.add(
        String(req.params.productId),
        {
          relatedProductId: req.body.relatedProductId,
          type: req.body.type as RelationshipType,
          sortOrder: req.body.sortOrder,
        },
        actorFromRequest(req),
      ),
    );
  }),
);

catalogRouter.put(
  '/products/:productId/relationships',
  authorizeAny(...updatePerms),
  validate({ params: S.productIdParamsSchema, body: S.relationshipReplaceSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productRelationshipService.replaceType(
        String(req.params.productId),
        req.body.type as RelationshipType,
        req.body.relatedProductIds,
        actorFromRequest(req),
      ),
      'Replaced',
    );
  }),
);

catalogRouter.delete(
  '/relationships/:relationshipId',
  authorizeAny(...updatePerms),
  validate({ params: S.relationshipIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await productRelationshipService.remove(
        String(req.params.relationshipId),
        actorFromRequest(req),
      ),
      'Deleted',
    );
  }),
);
