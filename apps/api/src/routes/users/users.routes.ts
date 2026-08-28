import { Router, type Request } from 'express';
import { PERMISSIONS } from '@/constants/permissions.js';
import { authenticate, authorizeAny, validate } from '@/middlewares/index.js';
import {
  adminCreateUserSchema,
  adminSetPasswordSchema,
  adminUpdateUserSchema,
  adminUserIdParamsSchema,
  adminUserListQuerySchema,
  adminGrantFlashSaleBulkSchema,
  adminUserService,
} from '@/services/admin-user.service.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import { HTTP_STATUS } from '@/constants/http.js';

const P = PERMISSIONS;

export const usersRouter = Router();

usersRouter.use(authenticate);

function actor(req: Request) {
  return {
    userId: req.user!.id,
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
    requestId: req.requestId,
  };
}

usersRouter.get(
  '/',
  authorizeAny(P.USERS_READ, P.USERS_MANAGE),
  validate({ query: adminUserListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

usersRouter.post(
  '/',
  authorizeAny(P.USERS_CREATE, P.USERS_MANAGE),
  validate({ body: adminCreateUserSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.create(req.body, actor(req));
    ApiResponse.success(res, result, 'User created', HTTP_STATUS.CREATED);
  }),
);

usersRouter.post(
  '/flash-sale/grant-bulk',
  authorizeAny(P.USERS_UPDATE, P.USERS_MANAGE),
  validate({ body: adminGrantFlashSaleBulkSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.grantFlashSaleBulk(req.body.userIds, actor(req));
    ApiResponse.success(res, result, result.message);
  }),
);

usersRouter.get(
  '/:userId',
  authorizeAny(P.USERS_READ, P.USERS_MANAGE),
  validate({ params: adminUserIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.getById(String(req.params.userId));
    ApiResponse.success(res, result);
  }),
);

usersRouter.patch(
  '/:userId',
  authorizeAny(P.USERS_UPDATE, P.USERS_LOCK, P.USERS_MANAGE),
  validate({ params: adminUserIdParamsSchema, body: adminUpdateUserSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.update(String(req.params.userId), req.body, actor(req));
    ApiResponse.success(res, result, 'User updated');
  }),
);

usersRouter.post(
  '/:userId/set-password',
  authorizeAny(P.USERS_UPDATE, P.USERS_MANAGE),
  validate({ params: adminUserIdParamsSchema, body: adminSetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.setPassword(
      String(req.params.userId),
      req.body.password,
      actor(req),
    );
    ApiResponse.success(res, result, result.message);
  }),
);

usersRouter.post(
  '/:userId/flash-sale/grant',
  authorizeAny(P.USERS_UPDATE, P.USERS_MANAGE),
  validate({ params: adminUserIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.grantFlashSale(String(req.params.userId), actor(req));
    ApiResponse.success(res, result, result.message);
  }),
);

usersRouter.delete(
  '/:userId',
  authorizeAny(P.USERS_DELETE, P.USERS_MANAGE),
  validate({ params: adminUserIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.softDelete(String(req.params.userId), actor(req));
    ApiResponse.success(res, result, result.message);
  }),
);
