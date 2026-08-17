import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { appConfig } from '@/config/app.config.js';
import { validate } from '@/middlewares/validate.middleware.js';
import { trackEventBodySchema } from '@/schemas/tracking.schema.js';
import { analyticsService } from '@/services/analytics/analytics.service.js';
import {
  getMetaPurchaseStatus,
  replayLatestMetaPurchase,
  replayMetaPurchaseForOrderNumber,
  sendTestMetaPurchase,
} from '@/services/analytics/purchase-tracking.service.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiError } from '@/utils/errors/api-error.js';

export const trackingRouter = Router();

const trackingRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many tracking requests' },
});

trackingRouter.post(
  '/event',
  trackingRateLimit,
  validate({ body: trackEventBodySchema }),
  asyncHandler(async (req, res) => {
    const { eventName, url, eventId, userData, customData, tiktokProperties } =
      req.body as ReturnType<typeof trackEventBodySchema.parse>;

    const enrichedUserData = userData
      ? {
          ...userData,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] ?? null,
        }
      : { ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null };

    // Fire-and-forget — response is immediate, send doesn't block the client
    void analyticsService
      .track({
        eventName,
        url,
        eventId,
        userData: enrichedUserData,
        customData: customData as Record<string, unknown> | undefined,
        tiktokProperties: tiktokProperties as Record<string, unknown> | undefined,
      })
      .catch(() => {
        /* errors already logged inside each service */
      });

    ApiResponse.success(res, { accepted: true }, 'Event accepted');
  }),
);

/** Replay Purchase for the most recent order — test mode only. */
trackingRouter.post(
  '/replay-purchase/latest',
  trackingRateLimit,
  asyncHandler(async (req, res) => {
    if (!appConfig.analytics.meta.testEventCode) {
      throw ApiError.forbidden(
        'Purchase replay is only available while META_TEST_EVENT_CODE is set',
      );
    }

    const force = req.query.force === 'true' || req.query.force === '1';
    const result = await replayLatestMetaPurchase({ force });
    if (!result) {
      throw ApiError.notFound('No orders found to replay Purchase');
    }

    if (!result.sent) {
      const status = await getMetaPurchaseStatus(result.orderNumber);
      throw ApiError.badRequest(
        status?.log?.lastError ?? 'Meta rejected Purchase replay for latest order',
      );
    }

    ApiResponse.success(
      res,
      { ...result, eventId: `purchase-${result.orderNumber}`, force },
      'Purchase replayed for latest order',
    );
  }),
);

/** Replay Purchase CAPI for an existing order — only when Meta test mode is active. */
trackingRouter.post(
  '/replay-purchase/:orderNumber',
  trackingRateLimit,
  asyncHandler(async (req, res) => {
    if (!appConfig.analytics.meta.testEventCode) {
      throw ApiError.forbidden(
        'Purchase replay is only available while META_TEST_EVENT_CODE is set',
      );
    }

    const orderNumber = String(req.params.orderNumber ?? '').trim();
    if (!orderNumber) {
      throw ApiError.badRequest('orderNumber is required');
    }

    const force = req.query.force === 'true' || req.query.force === '1';
    const outcome = await replayMetaPurchaseForOrderNumber(orderNumber, { force });

    if (outcome === 'not_found') {
      throw ApiError.notFound(`No order found for order number ${orderNumber}`);
    }

    if (outcome === 'failed') {
      const status = await getMetaPurchaseStatus(orderNumber);
      throw ApiError.badRequest(status?.log?.lastError ?? 'Meta rejected Purchase replay');
    }

    ApiResponse.success(
      res,
      { orderNumber, eventId: `purchase-${orderNumber}`, force },
      'Purchase replayed',
    );
  }),
);

/** Send a synthetic Purchase to Meta Test Events — test mode only. */
trackingRouter.post(
  '/test-purchase',
  trackingRateLimit,
  asyncHandler(async (req, res) => {
    if (!appConfig.analytics.meta.testEventCode) {
      throw ApiError.forbidden(
        'Test Purchase is only available while META_TEST_EVENT_CODE is set',
      );
    }

    const value =
      typeof req.body?.value === 'number' && req.body.value > 0 ? req.body.value : undefined;

    const result = await sendTestMetaPurchase({ value });
    ApiResponse.success(res, result, 'Test Purchase sent to Meta');
  }),
);

/** Debug Purchase log status for an order — test mode only. */
trackingRouter.get(
  '/purchase-status/:orderNumber',
  trackingRateLimit,
  asyncHandler(async (req, res) => {
    if (!appConfig.analytics.meta.testEventCode) {
      throw ApiError.forbidden(
        'Purchase status is only available while META_TEST_EVENT_CODE is set',
      );
    }

    const orderNumber = String(req.params.orderNumber ?? '').trim();
    const status = await getMetaPurchaseStatus(orderNumber);
    if (!status) {
      throw ApiError.notFound(`No order found for order number ${orderNumber}`);
    }

    ApiResponse.success(res, status, 'Purchase status');
  }),
);
