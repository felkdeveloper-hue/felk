import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '@/middlewares/validate.middleware';
import { trackEventBodySchema } from '@/schemas/tracking.schema';
import { analyticsService } from '@/services/analytics/analytics.service';
import { ApiResponse } from '@/utils/response/api-response';
import { asyncHandler } from '@/utils/async-handler';

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
