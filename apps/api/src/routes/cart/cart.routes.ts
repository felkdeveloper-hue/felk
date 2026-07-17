import { Router, type Response } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { optionalAuthenticate, authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { cartService, extractGuestToken } from '@/services/cart.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import { GUEST_CART_COOKIE, GUEST_CART_HEADER } from '@/constants/cart';
import * as S from '@/schemas/cart.schema';
import { appConfig } from '@/config/app.config';

const P = PERMISSIONS;

const managePerms = [P.CART_MANAGE, P.ACCOUNT_UPDATE] as const;
const adminViewPerms = [P.CART_VIEW, P.CUSTOMERS_VIEW, P.CUSTOMERS_READ] as const;

export const cartRouter = Router();

function setGuestCartCookie(res: Response, token: string) {
  res.cookie(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: appConfig.cookie.sameSite,
    secure: appConfig.cookie.secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.setHeader(GUEST_CART_HEADER, token);
}

async function requireCartAccess(req: Parameters<typeof cartService.resolveOwner>[0]) {
  // Guests always allowed; authenticated users need manage/view/account perms
  if (!req.user) return;
  const perms = req.user.permissions;
  const allowed =
    perms.includes(P.CART_MANAGE) ||
    perms.includes(P.ACCOUNT_UPDATE) ||
    perms.includes(P.ACCOUNT_READ) ||
    perms.includes(P.CART_VIEW) ||
    perms.includes(P.CUSTOMERS_VIEW) ||
    perms.includes(P.CUSTOMERS_READ);
  if (!allowed) {
    throw ApiError.forbidden('Cart access denied');
  }
}

cartRouter.use(optionalAuthenticate);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.getCart(owner);
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view);
  }),
);

cartRouter.post(
  '/items',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      // ensure mutation permission for authenticated users
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const body = S.cartAddItemSchema.parse(req.body);
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.addItem(owner, body, actorFromRequest(req));
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.created(res, view);
  }),
);

cartRouter.patch(
  '/items/:id',
  validate({ params: S.cartItemIdParamsSchema, body: S.cartUpdateItemSchema }),
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.updateItem(
      owner,
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view, 'Updated');
  }),
);

cartRouter.delete(
  '/items/:id',
  validate({ params: S.cartItemIdParamsSchema }),
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.removeItem(owner, String(req.params.id), actorFromRequest(req));
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view, 'Removed');
  }),
);

cartRouter.post(
  '/merge',
  authenticate,
  authorizeAny(...managePerms),
  validate({ body: S.cartMergeSchema }),
  asyncHandler(async (req, res) => {
    const owner = await cartService.resolveOwner(req);
    if (!owner.customerId) throw ApiError.unauthorized();
    const token = req.body.guestCartToken || extractGuestToken(req);
    if (!token) throw ApiError.badRequest('guestCartToken is required');
    const view = await cartService.merge(owner.customerId, token, actorFromRequest(req));
    ApiResponse.success(res, view, 'Cart merged');
  }),
);

cartRouter.post(
  '/save-for-later',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const body = S.cartItemIdsSchema.parse(req.body);
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.saveForLater(owner, body, actorFromRequest(req));
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view, 'Saved for later');
  }),
);

cartRouter.post(
  '/restore',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const body = S.cartItemIdsSchema.parse(req.body);
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.restore(owner, body, actorFromRequest(req));
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view, 'Restored to cart');
  }),
);

cartRouter.delete(
  '/clear',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    if (req.user) {
      const perms = req.user.permissions;
      if (!perms.includes(P.CART_MANAGE) && !perms.includes(P.ACCOUNT_UPDATE)) {
        throw ApiError.forbidden('Cart manage permission required');
      }
    }
    const owner = await cartService.resolveOwner(req);
    const view = await cartService.clear(owner, actorFromRequest(req), 'cart');
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, view, 'Cart cleared');
  }),
);

cartRouter.post(
  '/validate',
  asyncHandler(async (req, res) => {
    await requireCartAccess(req);
    const owner = await cartService.resolveOwner(req);
    const cart = await cartService.getOrCreateCart(owner);
    const validation = await cartService.validateCart(cart._id.toString());
    const view = await cartService.buildView(cart, {
      guestCartToken: owner.guestToken ?? cart.guestToken,
      validate: false,
    });
    if (owner.guestToken) setGuestCartCookie(res, owner.guestToken);
    ApiResponse.success(res, { ...view, validation });
  }),
);

/** Admin read-only: inspect a customer cart */
cartRouter.get(
  '/admin/:customerId',
  authenticate,
  authorizeAny(...adminViewPerms),
  validate({ params: S.cartAdminCustomerParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await cartService.adminGetByCustomerId(String(req.params.customerId)));
  }),
);
