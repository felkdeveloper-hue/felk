import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { appConfig } from '@/config/app.config.js';
import { validate } from '@/middlewares/validate.middleware.js';
import { trackEventBodySchema } from '@/schemas/tracking.schema.js';
import { analyticsService } from '@/services/analytics/analytics.service.js';
import { replayMetaPurchaseForOrderNumber } from '@/services/analytics/purchase-tracking.service.js';
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

    const sent = await replayMetaPurchaseForOrderNumber(orderNumber);
    if (!sent) {
      throw ApiError.notFound(`No order found for order number ${orderNumber}`);
    }

    ApiResponse.success(
      res,
      { orderNumber, eventId: `purchase-${orderNumber}` },
      'Purchase replayed',
    );
  }),
);
