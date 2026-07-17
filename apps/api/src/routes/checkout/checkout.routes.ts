import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { checkoutService } from '@/services/checkout.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import * as S from '@/schemas/checkout.schema';
import type { ShippingMethod } from '@/constants/checkout';

const P = PERMISSIONS;

const managePerms = [P.CHECKOUT_MANAGE, P.CART_MANAGE, P.ACCOUNT_UPDATE] as const;
const viewPerms = [P.CHECKOUT_MANAGE, P.CHECKOUT_VIEW, P.CART_MANAGE, P.ACCOUNT_READ] as const;
const adminViewPerms = [P.CHECKOUT_VIEW, P.CUSTOMERS_VIEW, P.CUSTOMERS_READ] as const;

const checkoutRefBodySchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    checkoutId: z.string().trim().min(1).optional(),
    checkoutToken: z.string().trim().min(1).optional(),
  })
  .refine((b) => Boolean(b.id || b.checkoutId || b.checkoutToken), {
    message: 'id, checkoutId, or checkoutToken is required',
  });

function resolveCheckoutRef(body: { id?: string; checkoutId?: string; checkoutToken?: string }) {
  return String(body.id ?? body.checkoutId ?? body.checkoutToken);
}

export const checkoutRouter = Router();

checkoutRouter.use(authenticate);

checkoutRouter.post(
  '/start',
  authorizeAny(...managePerms),
  validate({ body: S.checkoutStartSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const summary = await checkoutService.start(
      req.user,
      {
        ...req.body,
        shippingMethod: req.body.shippingMethod as ShippingMethod | undefined,
      },
      actorFromRequest(req),
    );
    ApiResponse.created(res, summary, 'Checkout started');
  }),
);

checkoutRouter.post(
  '/validate',
  authorizeAny(...managePerms),
  validate({ body: checkoutRefBodySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.validate(resolveCheckoutRef(req.body), req.user, actorFromRequest(req)),
      'Validated',
    );
  }),
);

checkoutRouter.post(
  '/reserve',
  authorizeAny(...managePerms),
  validate({ body: checkoutRefBodySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.reserve(resolveCheckoutRef(req.body), req.user, actorFromRequest(req)),
      'Reserved',
    );
  }),
);

checkoutRouter.post(
  '/release',
  authorizeAny(...managePerms),
  validate({ body: checkoutRefBodySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.release(resolveCheckoutRef(req.body), req.user, actorFromRequest(req)),
      'Released',
    );
  }),
);

checkoutRouter.post(
  '/refresh',
  authorizeAny(...managePerms),
  validate({
    body: S.checkoutRefreshSchema.and(checkoutRefBodySchema),
  }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.refresh(
        resolveCheckoutRef(req.body),
        req.user,
        {
          ...req.body,
          shippingMethod: req.body.shippingMethod as ShippingMethod | undefined,
        },
        actorFromRequest(req),
      ),
      'Refreshed',
    );
  }),
);

checkoutRouter.delete(
  '/cancel',
  authorizeAny(...managePerms),
  validate({ body: checkoutRefBodySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.cancel(resolveCheckoutRef(req.body), req.user, actorFromRequest(req)),
      'Cancelled',
    );
  }),
);

checkoutRouter.get(
  '/:id',
  authorizeAny(...viewPerms, ...adminViewPerms),
  validate({ params: S.checkoutIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await checkoutService.get(String(req.params.id), req.user));
  }),
);

checkoutRouter.delete(
  '/:id',
  authorizeAny(...managePerms),
  validate({ params: S.checkoutIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await checkoutService.cancel(String(req.params.id), req.user, actorFromRequest(req)),
      'Cancelled',
    );
  }),
);
