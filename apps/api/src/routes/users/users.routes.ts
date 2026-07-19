import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { adminUserListQuerySchema, adminUserService } from '@/services/admin-user.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';

const P = PERMISSIONS;

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
  '/',
  authorizeAny(P.USERS_READ, P.USERS_MANAGE),
  validate({ query: adminUserListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await adminUserService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);
