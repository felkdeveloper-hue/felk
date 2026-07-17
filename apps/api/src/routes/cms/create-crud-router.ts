import { Router } from 'express';
import type { Model } from 'mongoose';
import type { ZodTypeAny } from 'zod';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import type { PermissionKey } from '@/constants/permissions';
import { CmsCrudService, actorFromRequest } from '@/services/cms-crud.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { bulkStatusSchema, cmsListQuerySchema, idsBodySchema } from '@/schemas/cms.shared.schema';
import { objectIdSchema } from '@/schemas/common.schema';
import { z } from 'zod';

export interface CrudRouteConfig {
  resource: string;
  path: string;
  model: Model<any>;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  permissions: {
    view: PermissionKey | PermissionKey[];
    create: PermissionKey | PermissionKey[];
    update: PermissionKey | PermissionKey[];
    delete: PermissionKey | PermissionKey[];
  };
  searchFields?: string[];
  sortableFields?: string[];
  service?: CmsCrudService;
}

function asPerms(value: PermissionKey | PermissionKey[]): PermissionKey[] {
  return Array.isArray(value) ? value : [value];
}

const idParams = z.object({ id: objectIdSchema });

export function createCrudRouter(config: CrudRouteConfig): Router {
  const router = Router();
  const service =
    config.service ??
    new CmsCrudService(config.resource, config.model, config.searchFields, config.sortableFields);

  router.use(authenticate);

  router.get(
    '/',
    authorizeAny(...asPerms(config.permissions.view)),
    validate({ query: cmsListQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await service.list(req.query as never);
      ApiResponse.success(res, result.data, 'OK', 200, result.meta);
    }),
  );

  router.get(
    '/export',
    authorizeAny(...asPerms(config.permissions.view)),
    validate({ query: cmsListQuerySchema }),
    asyncHandler(async (req, res) => {
      const result = await service.exportAll(req.query as never);
      ApiResponse.success(res, result.data, 'Export ready', 200, result.meta);
    }),
  );

  router.post(
    '/bulk-delete',
    authorizeAny(...asPerms(config.permissions.delete)),
    validate({ body: idsBodySchema }),
    asyncHandler(async (req, res) => {
      const result = await service.bulkDelete(req.body.ids, actorFromRequest(req));
      ApiResponse.success(res, result, 'Bulk delete complete');
    }),
  );

  router.post(
    '/bulk-status',
    authorizeAny(...asPerms(config.permissions.update)),
    validate({ body: bulkStatusSchema }),
    asyncHandler(async (req, res) => {
      const result = await service.bulkStatus(req.body.ids, req.body.status, actorFromRequest(req));
      ApiResponse.success(res, result, 'Bulk status update complete');
    }),
  );

  router.get(
    '/:id',
    authorizeAny(...asPerms(config.permissions.view)),
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      const id = String(req.params.id);
      const doc = await service.getById(id, req.query.includeDeleted === 'true');
      ApiResponse.success(res, doc);
    }),
  );

  router.post(
    '/',
    authorizeAny(...asPerms(config.permissions.create)),
    validate({ body: config.createSchema }),
    asyncHandler(async (req, res) => {
      const doc = await service.create(req.body, actorFromRequest(req));
      ApiResponse.created(res, doc);
    }),
  );

  router.patch(
    '/:id',
    authorizeAny(...asPerms(config.permissions.update)),
    validate({ params: idParams, body: config.updateSchema }),
    asyncHandler(async (req, res) => {
      const doc = await service.update(String(req.params.id), req.body, actorFromRequest(req));
      ApiResponse.success(res, doc, 'Updated');
    }),
  );

  router.delete(
    '/:id',
    authorizeAny(...asPerms(config.permissions.delete)),
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      const doc = await service.remove(String(req.params.id), actorFromRequest(req));
      ApiResponse.success(res, doc, 'Deleted');
    }),
  );

  router.post(
    '/:id/restore',
    authorizeAny(...asPerms(config.permissions.update)),
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      const doc = await service.restore(String(req.params.id), actorFromRequest(req));
      ApiResponse.success(res, doc, 'Restored');
    }),
  );

  return router;
}
