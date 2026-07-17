import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions';
import { authenticate, authorizeAny, validate } from '@/middlewares';
import { actorFromRequest } from '@/services/cms-crud.service';
import { paymentService } from '@/services/payment.service';
import { refundService } from '@/services/refund.service';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { ApiError } from '@/utils/errors/api-error';
import * as S from '@/schemas/payment.schema';
import type { PaymentMethod } from '@/constants/payment-status';

const P = PERMISSIONS;

const createPerms = [P.PAYMENTS_CREATE, P.PAYMENTS_MANAGE] as const;
const ownViewPerms = [P.PAYMENTS_VIEW_OWN, P.PAYMENTS_VIEW, P.PAYMENTS_MANAGE] as const;
const financePerms = [P.PAYMENTS_VIEW, P.PAYMENTS_MANAGE] as const;
const refundPerms = [P.PAYMENTS_REFUND, P.PAYMENTS_MANAGE] as const;
const exportPerms = [P.PAYMENTS_EXPORT, P.PAYMENTS_MANAGE] as const;

export const paymentsRouter = Router();

/* -------------------------------------------------------------------------- */
/* Public — gateway webhooks & return-page status probe                     */
/* NEVER gated behind JWT auth: gateways call these directly and prove       */
/* authenticity via signature, not a bearer token.                           */
/* -------------------------------------------------------------------------- */

function webhookHandler(gateway: string) {
  return asyncHandler(async (req, res) => {
    const result = await paymentService.handleWebhook(gateway, {
      headers: req.headers,
      rawBody: req.rawBody,
      body: req.body,
      ip: req.ip,
    });

    if (!result.ok && result.reason === 'invalid_signature') {
      throw ApiError.badRequest('Invalid webhook signature', undefined, 'INVALID_SIGNATURE');
    }

    // Always acknowledge with 200 once signature-verified (even for business
    // rejections) so the gateway does not endlessly retry a request that will
    // never succeed.
    ApiResponse.success(res, result, 'Webhook processed');
  });
}

paymentsRouter.post('/webhooks/payhere', webhookHandler('payhere'));
paymentsRouter.post('/webhooks/koko', webhookHandler('koko'));
paymentsRouter.post('/webhooks/mintpay', webhookHandler('mintpay'));
paymentsRouter.post('/webhooks/cod', webhookHandler('cod'));

paymentsRouter.get(
  '/status/:checkoutToken',
  validate({ params: S.checkoutTokenParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(
      res,
      await paymentService.getStatusByCheckoutToken(String(req.params.checkoutToken)),
    );
  }),
);

/* -------------------------------------------------------------------------- */
/* Authenticated                                                             */
/* -------------------------------------------------------------------------- */

paymentsRouter.post(
  '/create',
  authenticate,
  authorizeAny(...createPerms),
  validate({ body: S.paymentCreateSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as {
      checkoutId?: string;
      checkoutToken?: string;
      method: PaymentMethod;
      returnUrl?: string;
      cancelUrl?: string;
    };
    const summary = await paymentService.createPayment(
      req.user,
      {
        checkoutRef: String(body.checkoutId ?? body.checkoutToken),
        method: body.method,
        returnUrl: body.returnUrl,
        cancelUrl: body.cancelUrl,
      },
      actorFromRequest(req),
    );
    ApiResponse.created(res, summary, 'Payment created');
  }),
);

paymentsRouter.post(
  '/retry',
  authenticate,
  authorizeAny(...createPerms),
  validate({ body: S.paymentRetrySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as { paymentId?: string; checkoutToken?: string; method?: PaymentMethod };
    const summary = await paymentService.retryPayment(
      req.user,
      { paymentRef: String(body.paymentId ?? body.checkoutToken), method: body.method },
      actorFromRequest(req),
    );
    ApiResponse.success(res, summary, 'Payment retried');
  }),
);

paymentsRouter.get(
  '/export',
  authenticate,
  authorizeAny(...exportPerms),
  validate({ query: S.paymentListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query as Record<string, string>;
    ApiResponse.success(
      res,
      await paymentService.list({ ...query, limit: 100 }, req.user),
      'Export snapshot',
    );
  }),
);

paymentsRouter.get(
  '/',
  authenticate,
  authorizeAny(...ownViewPerms, ...financePerms),
  validate({ query: S.paymentListQuerySchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query as Record<string, string>;
    const { items, meta } = await paymentService.list(query, req.user);
    ApiResponse.success(res, items, 'Success', undefined, meta);
  }),
);

paymentsRouter.get(
  '/:id',
  authenticate,
  authorizeAny(...ownViewPerms, ...financePerms),
  validate({ params: S.paymentIdParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ApiResponse.success(res, await paymentService.getById(String(req.params.id), req.user));
  }),
);

paymentsRouter.post(
  '/:id/refund',
  authenticate,
  authorizeAny(...refundPerms),
  validate({ params: S.paymentIdParamsSchema, body: S.refundRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const summary = await refundService.request(
      String(req.params.id),
      req.body as { amount?: number; reason?: string },
      actorFromRequest(req),
    );
    ApiResponse.created(res, summary, 'Refund requested');
  }),
);

paymentsRouter.get(
  '/:id/refunds',
  authenticate,
  authorizeAny(...refundPerms, ...financePerms),
  validate({ params: S.paymentIdParamsSchema }),
  asyncHandler(async (req, res) => {
    ApiResponse.success(res, await refundService.listForPayment(String(req.params.id)));
  }),
);
