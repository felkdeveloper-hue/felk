import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { adminAuditService, auditListQuerySchema } from '@/services/admin-audit.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';

const P = PERMISSIONS;

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get(
  '/',
  authorizeAny(P.AUDIT_READ, P.ACTIVITY_READ),
  validate({ query: auditListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await adminAuditService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);
