import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions.js';
import { authenticate, authorizeAny, validate } from '@/middlewares/index.js';
import { adminAuditService, auditListQuerySchema } from '@/services/admin-audit.service.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';

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
