import { Router } from 'express';
import { PERMISSIONS } from '@/constants/permissions.js';
import { authenticate, authorizeAny, validate } from '@/middlewares/index.js';
import { actorFromRequest } from '@/services/cms-crud.service.js';
import { paymentService } from '@/services/payment.service.js';
import { refundService } from '@/services/refund.service.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import { ApiError } from '@/utils/errors/api-error.js';
import * as S from '@/schemas/payment.schema.js';
import type { PaymentMethod } from '@/constants/payment-status.js';
import { emitBusinessEvent } from '@/services/platform-analytics/index.js';

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

    const paymentStatus = (result as { payment?: { status?: string; id?: string } }).payment
      ?.status;
    if (result.ok && paymentStatus === 'paid') {
      const payment = (result as { payment?: { id?: string; amount?: number; currency?: string } })
        .payment;
      void emitBusinessEvent({
        eventId: crypto.randomUUID(),
        name: 'payment_completed',
        properties: {
          gateway,
          paymentId: payment?.id ?? null,
          amount: payment?.amount ?? null,
          currency: payment?.currency ?? null,
        },
      });
    } else if (
      result.ok &&
      (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'canceled')
    ) {
      const payment = (result as { payment?: { id?: string; amount?: number; currency?: string } })
        .payment;
      void emitBusinessEvent({
        eventId: crypto.randomUUID(),
        name: 'payment_failed',
        properties: {
          gateway,
          paymentId: payment?.id ?? null,
          amount: payment?.amount ?? null,
          currency: payment?.currency ?? null,
          status: paymentStatus,
        },
      });
    }

    // Always acknowledge with 200 once signature-verified (even for business
    // rejections) so the gateway does not endlessly retry a request that will
    // never succeed.
    ApiResponse.success(res, result, 'Webhook processed');
  });
}

paymentsRouter.post('/webhooks/payhere', webhookHandler('payhere'));
paymentsRouter.post('/webhooks/koko', webhookHandler('koko'));
paymentsRouter.post('/webhooks/cod', webhookHandler('cod'));

function mintpayQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

function mintpayReturnParams(req: {
  query?: Record<string, unknown>;
  body?: unknown;
}): Record<string, unknown> {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  return { ...(req.query ?? {}), ...(body as Record<string, unknown>) };
}

function isMintpayBrowserReturn(req: { query?: Record<string, unknown>; body?: unknown }): boolean {
  const params = mintpayReturnParams(req);
  const orderId = mintpayQueryValue(params.orderId || params.order_id);
  const hash = mintpayQueryValue(params.hash);
  return Boolean(orderId && hash);
}

const mintpayReturnHandler = asyncHandler(async (req, res) => {
  const params = mintpayReturnParams(req as { query?: Record<string, unknown>; body?: unknown });
  const result = await paymentService.handleMintpayBrowserReturn({
    orderId: mintpayQueryValue(params.orderId || params.order_id),
    hash: mintpayQueryValue(params.hash),
  });
  res.redirect(302, result.redirectUrl);
});

// Mintpay confirms via browser GET/POST to success_url (HMAC hash), not a JSON IPN.
paymentsRouter.get('/webhooks/mintpay', mintpayReturnHandler);
paymentsRouter.post(
  '/webhooks/mintpay',
  asyncHandler(async (req, res, next) => {
    if (isMintpayBrowserReturn(req as { query?: Record<string, unknown>; body?: unknown })) {
      return mintpayReturnHandler(req, res, next);
    }
    return webhookHandler('mintpay')(req, res, next);
  }),
);

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
