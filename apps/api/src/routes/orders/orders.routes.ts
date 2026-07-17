import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { orderService } from '@/services/order.service';
import { returnService } from '@/services/return.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import * as S from '@/schemas/order.schema';
import type { OrderStatus } from '@/constants/order-status';

const P = PERMISSIONS;

const readPerms = [P.ORDERS_READ_OWN, P.ORDERS_READ, P.ORDERS_VIEW] as const;
const updatePerms = [P.ORDERS_UPDATE] as const;
const cancelPerms = [P.ORDERS_CANCEL_OWN, P.ORDERS_CANCEL] as const;
const notesPerms = [P.ORDERS_NOTES] as const;
const invoicePerms = [P.ORDERS_INVOICE, P.ORDERS_READ_OWN, P.ORDERS_READ, P.ORDERS_VIEW] as const;
const exportPerms = [P.ORDERS_EXPORT] as const;
const returnPerms = [P.ORDERS_RETURN_OWN, P.ORDERS_RETURN_MANAGE] as const;

export const ordersRouter = Router();

ordersRouter.get(
  '/export',
  authenticate,
  authorizeAny(...exportPerms),
  validate({ query: S.orderListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query as Record<string, string>;
    const { items, meta } = await orderService.list({ ...query, limit: 100 }, req.user);
    ApiResponse.success(res, items, 'Export snapshot', undefined, meta);
  }),
);

ordersRouter.get(
  '/number/:orderNumber',
  authenticate,
  authorizeAny(...readPerms),
  validate({ params: S.orderNumberParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(
      res,
      await orderService.getByOrderNumber(String(req.params.orderNumber), req.user),
    );
  }),
);

ordersRouter.get(
  '/',
  authenticate,
  authorizeAny(...readPerms),
  validate({ query: S.orderListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query as Record<string, string>;
    const { items, meta } = await orderService.list(query, req.user);
    ApiResponse.success(res, items, 'Success', undefined, meta);
  }),
);

ordersRouter.get(
  '/:id',
  authenticate,
  authorizeAny(...readPerms),
  validate({ params: S.orderIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await orderService.getById(String(req.params.id), req.user));
  }),
);

ordersRouter.get(
  '/:id/timeline',
  authenticate,
  authorizeAny(...readPerms),
  validate({ params: S.orderIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await orderService.listTimeline(String(req.params.id), req.user));
  }),
);

ordersRouter.patch(
  '/:id/status',
  authenticate,
  authorizeAny(...updatePerms),
  validate({ params: S.orderIdParamsSchema, body: S.orderStatusUpdateSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as { status: OrderStatus; note?: string };
    const order = await orderService.updateStatus(
      String(req.params.id),
      body,
      req.user,
      actorFromRequest(req),
    );
    ApiResponse.success(res, order, 'Order status updated');
  }),
);

ordersRouter.post(
  '/:id/cancel',
  authenticate,
  authorizeAny(...cancelPerms),
  validate({ params: S.orderIdParamsSchema, body: S.orderCancelSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const order = await orderService.cancel(
      String(req.params.id),
      req.body as { reason?: string },
      req.user,
      actorFromRequest(req),
    );
    ApiResponse.success(res, order, 'Order cancelled');
  }),
);

ordersRouter.post(
  '/:id/note',
  authenticate,
  authorizeAny(...notesPerms),
  validate({ params: S.orderIdParamsSchema, body: S.orderNoteSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const note = await orderService.addNote(
      String(req.params.id),
      req.body as { note: string; isInternal?: boolean },
      req.user,
      actorFromRequest(req),
    );
    ApiResponse.created(res, note, 'Note added');
  }),
);

ordersRouter.get(
  '/:id/notes',
  authenticate,
  authorizeAny(...notesPerms),
  validate({ params: S.orderIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await orderService.listNotes(String(req.params.id), req.user));
  }),
);

ordersRouter.get(
  '/:id/invoice',
  authenticate,
  authorizeAny(...invoicePerms),
  validate({ params: S.orderIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await orderService.getInvoice(String(req.params.id), req.user));
  }),
);

ordersRouter.post(
  '/:id/return',
  authenticate,
  authorizeAny(...returnPerms),
  validate({ params: S.orderIdParamsSchema, body: S.orderReturnRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const returnRequest = await returnService.request(
      String(req.params.id),
      req.body as { orderItemId?: string; reason: string; description?: string; images?: string[] },
      req.user,
      actorFromRequest(req),
    );
    ApiResponse.created(res, returnRequest, 'Return requested');
  }),
);

ordersRouter.get(
  '/:id/returns',
  authenticate,
  authorizeAny(...readPerms),
  validate({ params: S.orderIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await returnService.listForOrder(String(req.params.id)));
  }),
);
