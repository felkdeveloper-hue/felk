import { Router, type Request } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { customerService } from '@/services/customer.service';
import { customerAddressService } from '@/services/customer-address.service';
import { wishlistService } from '@/services/wishlist.service';
import { recentlyViewedService, savedItemService } from '@/services/recently-viewed.service';
import { rewardService, referralService } from '@/services/reward.service';
import { customerNoteService, customerTagService } from '@/services/customer-notes-tags.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import * as S from '@/schemas/customer.schema';
import { z } from 'zod';

const P = PERMISSIONS;

const adminView = [P.CUSTOMERS_VIEW, P.CUSTOMERS_READ] as const;
const adminUpdate = [P.CUSTOMERS_UPDATE] as const;
const adminDelete = [P.CUSTOMERS_DELETE] as const;
const notesPerms = [P.CUSTOMERS_NOTES] as const;
const tagsPerms = [P.CUSTOMERS_TAGS] as const;
const selfAccount = [P.ACCOUNT_READ, P.ACCOUNT_UPDATE] as const;
const addressPerms = [P.ADDRESSES_MANAGE] as const;
const wishlistPerms = [P.WISHLIST_MANAGE] as const;

export const customersRouter = Router();

customersRouter.use(authenticate);

async function resolveMeCustomer(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return customerService.ensureForUser(req.user, actorFromRequest(req));
}

/* -------------------------------------------------------------------------- */
/* Self: /me                                                                   */
/* -------------------------------------------------------------------------- */

customersRouter.get(
  '/me',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, customer);
  }),
);

customersRouter.patch(
  '/me',
  authorizeAny(P.ACCOUNT_UPDATE, ...adminUpdate),
  validate({ body: S.customerProfileUpdateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await customerService.updateProfile(customer._id.toString(), req.body, actorFromRequest(req)),
      'Profile updated',
    );
  }),
);

customersRouter.get(
  '/me/preferences',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, {
      preferences: customer.preferences,
      notificationPreferences: customer.notificationPreferences,
    });
  }),
);

customersRouter.patch(
  '/me/preferences',
  authorizeAny(P.ACCOUNT_UPDATE, ...adminUpdate),
  validate({ body: S.preferencesUpdateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await customerService.updatePreferences(
        customer._id.toString(),
        req.body,
        actorFromRequest(req),
      ),
      'Preferences updated',
    );
  }),
);

/* Addresses — me */
customersRouter.get(
  '/me/addresses',
  authorizeAny(...addressPerms, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, await customerAddressService.list(customer._id.toString()));
  }),
);

customersRouter.post(
  '/me/addresses',
  authorizeAny(...addressPerms),
  validate({ body: S.addressCreateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(
      res,
      await customerAddressService.create(customer._id.toString(), req.body, actorFromRequest(req)),
    );
  }),
);

customersRouter.patch(
  '/me/addresses/:addressId',
  authorizeAny(...addressPerms),
  validate({ params: S.meAddressIdParamsSchema, body: S.addressUpdateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await customerAddressService.update(
        customer._id.toString(),
        String(req.params.addressId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.delete(
  '/me/addresses/:addressId',
  authorizeAny(...addressPerms),
  validate({ params: S.meAddressIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await customerAddressService.remove(
        customer._id.toString(),
        String(req.params.addressId),
        actorFromRequest(req),
      ),
      'Deleted',
    );
  }),
);

/* Wishlists — me */
customersRouter.get(
  '/me/wishlists',
  authorizeAny(...wishlistPerms, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, await wishlistService.list(customer._id.toString()));
  }),
);

customersRouter.post(
  '/me/wishlists',
  authorizeAny(...wishlistPerms),
  validate({ body: S.wishlistCreateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(
      res,
      await wishlistService.create(customer._id.toString(), req.body, actorFromRequest(req)),
    );
  }),
);

customersRouter.get(
  '/me/wishlists/:wishlistId',
  authorizeAny(...wishlistPerms, ...adminView),
  validate({ params: S.meWishlistIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await wishlistService.getById(customer._id.toString(), String(req.params.wishlistId)),
    );
  }),
);

customersRouter.patch(
  '/me/wishlists/:wishlistId',
  authorizeAny(...wishlistPerms),
  validate({ params: S.meWishlistIdParamsSchema, body: S.wishlistUpdateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await wishlistService.update(
        customer._id.toString(),
        String(req.params.wishlistId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.delete(
  '/me/wishlists/:wishlistId',
  authorizeAny(...wishlistPerms),
  validate({ params: S.meWishlistIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await wishlistService.remove(
        customer._id.toString(),
        String(req.params.wishlistId),
        actorFromRequest(req),
      ),
      'Deleted',
    );
  }),
);

customersRouter.post(
  '/me/wishlists/:wishlistId/items',
  authorizeAny(...wishlistPerms),
  validate({ params: S.meWishlistIdParamsSchema, body: S.wishlistItemCreateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(
      res,
      await wishlistService.addItem(
        customer._id.toString(),
        String(req.params.wishlistId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

customersRouter.delete(
  '/me/wishlists/:wishlistId/items/:itemId',
  authorizeAny(...wishlistPerms),
  validate({ params: S.meWishlistItemParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await wishlistService.removeItem(
        customer._id.toString(),
        String(req.params.wishlistId),
        String(req.params.itemId),
        actorFromRequest(req),
      ),
      'Removed',
    );
  }),
);

customersRouter.post(
  '/me/wishlists/:wishlistId/share',
  authorizeAny(...wishlistPerms),
  validate({ params: S.meWishlistIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await wishlistService.enableShare(
        customer._id.toString(),
        String(req.params.wishlistId),
        actorFromRequest(req),
      ),
    );
  }),
);

/* Recently viewed / saved */
customersRouter.get(
  '/me/recently-viewed',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    ApiResponse.success(res, await recentlyViewedService.list(customer._id.toString(), limit));
  }),
);

customersRouter.post(
  '/me/recently-viewed',
  authorizeAny(...selfAccount),
  validate({ body: S.recentlyViewedCreateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(res, await recentlyViewedService.track(customer._id.toString(), req.body));
  }),
);

customersRouter.delete(
  '/me/recently-viewed',
  authorizeAny(...selfAccount),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, await recentlyViewedService.clear(customer._id.toString()));
  }),
);

customersRouter.get(
  '/me/saved-items',
  authorizeAny(...selfAccount, ...wishlistPerms, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, await savedItemService.list(customer._id.toString()));
  }),
);

customersRouter.post(
  '/me/saved-items',
  authorizeAny(...selfAccount, ...wishlistPerms),
  validate({ body: S.savedItemCreateSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(res, await savedItemService.add(customer._id.toString(), req.body));
  }),
);

customersRouter.delete(
  '/me/saved-items/:itemId',
  authorizeAny(...selfAccount, ...wishlistPerms),
  validate({ params: S.meSavedItemParamsSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await savedItemService.remove(customer._id.toString(), String(req.params.itemId)),
      'Removed',
    );
  }),
);

/* Rewards / referrals — me */
customersRouter.get(
  '/me/rewards',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(res, await rewardService.getBalance(customer._id.toString()));
  }),
);

customersRouter.get(
  '/me/rewards/history',
  authorizeAny(...selfAccount, ...adminView),
  validate({
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      type: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    const result = await rewardService.listHistory(customer._id.toString(), req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

customersRouter.get(
  '/me/referrals',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    const code = await referralService.getMyCode(customer._id.toString());
    const list = await referralService.list(customer._id.toString(), req.query as never);
    ApiResponse.success(res, { ...code, invitations: list.data }, 'OK', 200, list.meta);
  }),
);

customersRouter.post(
  '/me/referrals/invite',
  authorizeAny(...selfAccount),
  validate({ body: S.referralInviteSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.created(
      res,
      await referralService.invite(customer._id.toString(), req.body, actorFromRequest(req)),
    );
  }),
);

customersRouter.post(
  '/me/referrals/accept',
  authorizeAny(...selfAccount),
  validate({ body: S.referralAcceptSchema }),
  asyncHandler(async (req, res) => {
    const customer = await resolveMeCustomer(req);
    ApiResponse.success(
      res,
      await referralService.acceptByCode(
        req.body.referralCode,
        customer._id.toString(),
        actorFromRequest(req),
      ),
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Public shared wishlist                                                      */
/* -------------------------------------------------------------------------- */

customersRouter.get(
  '/wishlists/shared/:shareToken',
  asyncHandler(async (req, res) => {
    // authenticate still applied at router level — allow any authed user
    ApiResponse.success(res, await wishlistService.getByShareToken(String(req.params.shareToken)));
  }),
);

/* -------------------------------------------------------------------------- */
/* Admin: tags dictionary & loyalty                                            */
/* -------------------------------------------------------------------------- */

customersRouter.get(
  '/tags',
  authorizeAny(...tagsPerms, ...adminView),
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await customerTagService.list());
  }),
);

customersRouter.post(
  '/tags',
  authorizeAny(...tagsPerms),
  validate({ body: S.customerTagCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(res, await customerTagService.create(req.body, actorFromRequest(req)));
  }),
);

customersRouter.delete(
  '/tags/:id',
  authorizeAny(...tagsPerms),
  validate({ params: S.customerResourceIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerTagService.removeTagDefinition(String(req.params.id), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

customersRouter.get(
  '/loyalty-tiers',
  authorizeAny(...selfAccount, ...adminView),
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await customerService.listLoyaltyTiers());
  }),
);

customersRouter.post(
  '/rewards/expire-due',
  authorizeAny(...adminUpdate),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await rewardService.expireDue(actorFromRequest(req)));
  }),
);

/* -------------------------------------------------------------------------- */
/* Admin: customer CRUD                                                        */
/* -------------------------------------------------------------------------- */

customersRouter.get(
  '/',
  authorizeAny(...adminView),
  validate({ query: S.customerListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await customerService.list(req.query as never);
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);

customersRouter.get(
  '/:customerId',
  authorizeAny(...adminView),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await customerService.getById(String(req.params.customerId)));
  }),
);

customersRouter.patch(
  '/:customerId',
  authorizeAny(...adminUpdate),
  validate({ params: S.customerIdParamsSchema, body: S.customerAdminUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerService.adminUpdate(
        String(req.params.customerId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.delete(
  '/:customerId',
  authorizeAny(...adminDelete),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerService.softDelete(String(req.params.customerId), actorFromRequest(req)),
      'Deleted',
    );
  }),
);

/* Admin nested resources */
customersRouter.get(
  '/:customerId/addresses',
  authorizeAny(...adminView),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await customerAddressService.list(String(req.params.customerId)));
  }),
);

customersRouter.post(
  '/:customerId/addresses',
  authorizeAny(...adminUpdate, ...addressPerms),
  validate({ params: S.customerIdParamsSchema, body: S.addressCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await customerAddressService.create(
        String(req.params.customerId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

customersRouter.patch(
  '/:customerId/addresses/:addressId',
  authorizeAny(...adminUpdate, ...addressPerms),
  validate({ params: S.addressIdParamsSchema, body: S.addressUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerAddressService.update(
        String(req.params.customerId),
        String(req.params.addressId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.delete(
  '/:customerId/addresses/:addressId',
  authorizeAny(...adminUpdate, ...addressPerms),
  validate({ params: S.addressIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerAddressService.remove(
        String(req.params.customerId),
        String(req.params.addressId),
        actorFromRequest(req),
      ),
      'Deleted',
    );
  }),
);

customersRouter.get(
  '/:customerId/wishlists',
  authorizeAny(...adminView),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await wishlistService.list(String(req.params.customerId)));
  }),
);

customersRouter.patch(
  '/:customerId/preferences',
  authorizeAny(...adminUpdate),
  validate({ params: S.customerIdParamsSchema, body: S.preferencesUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerService.updatePreferences(
        String(req.params.customerId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.get(
  '/:customerId/notes',
  authorizeAny(...notesPerms, ...adminView),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await customerNoteService.list(String(req.params.customerId)));
  }),
);

customersRouter.post(
  '/:customerId/notes',
  authorizeAny(...notesPerms),
  validate({ params: S.customerIdParamsSchema, body: S.noteCreateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await customerNoteService.create(
        String(req.params.customerId),
        req.body,
        actorFromRequest(req),
      ),
    );
  }),
);

customersRouter.patch(
  '/:customerId/notes/:noteId',
  authorizeAny(...notesPerms),
  validate({ params: S.noteIdParamsSchema, body: S.noteUpdateSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerNoteService.update(
        String(req.params.customerId),
        String(req.params.noteId),
        req.body,
        actorFromRequest(req),
      ),
      'Updated',
    );
  }),
);

customersRouter.delete(
  '/:customerId/notes/:noteId',
  authorizeAny(...notesPerms),
  validate({ params: S.noteIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerNoteService.remove(
        String(req.params.customerId),
        String(req.params.noteId),
        actorFromRequest(req),
      ),
      'Deleted',
    );
  }),
);

customersRouter.put(
  '/:customerId/tags',
  authorizeAny(...tagsPerms),
  validate({ params: S.customerIdParamsSchema, body: S.assignTagsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerTagService.assignTags(
        String(req.params.customerId),
        req.body.tagKeys,
        actorFromRequest(req),
      ),
      'Tags assigned',
    );
  }),
);

customersRouter.post(
  '/:customerId/tags/:tagKey',
  authorizeAny(...tagsPerms),
  validate({ params: S.tagKeyParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerTagService.addTag(
        String(req.params.customerId),
        String(req.params.tagKey),
        actorFromRequest(req),
      ),
    );
  }),
);

customersRouter.delete(
  '/:customerId/tags/:tagKey',
  authorizeAny(...tagsPerms),
  validate({ params: S.tagKeyParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await customerTagService.removeTag(
        String(req.params.customerId),
        String(req.params.tagKey),
        actorFromRequest(req),
      ),
      'Removed',
    );
  }),
);

customersRouter.post(
  '/:customerId/rewards/earn',
  authorizeAny(...adminUpdate),
  validate({ params: S.customerIdParamsSchema, body: S.rewardPointsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await rewardService.earn(String(req.params.customerId), req.body, actorFromRequest(req)),
    );
  }),
);

customersRouter.post(
  '/:customerId/rewards/redeem',
  authorizeAny(...adminUpdate),
  validate({ params: S.customerIdParamsSchema, body: S.rewardPointsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.created(
      res,
      await rewardService.redeem(String(req.params.customerId), req.body, actorFromRequest(req)),
    );
  }),
);

customersRouter.get(
  '/:customerId/rewards/history',
  authorizeAny(...adminView),
  validate({ params: S.customerIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await rewardService.listHistory(
      String(req.params.customerId),
      req.query as never,
    );
    ApiResponse.success(res, result.data, 'OK', 200, result.meta);
  }),
);
