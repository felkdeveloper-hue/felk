import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '@/middlewares/validate.middleware.js';
import { authenticate, authorizeAny, optionalAuthenticate } from '@/middlewares/auth.middleware.js';
import { PERMISSIONS } from '@/constants/permissions.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import {
  collectBodySchema,
  analyticsFilterSchema,
  eventsFilterSchema,
} from '@/schemas/analytics/index.js';
import {
  processCollect,
  getOverview,
  getVisitors,
  getSessions,
  getPages,
  getLiveVisitors,
  getEvents,
  getEventNames,
  getEventBreakdown,
  getDeviceBreakdown,
  getGeoBreakdown,
  getTrafficSources,
} from '@/services/platform-analytics/index.js';

export const analyticsRouter = Router();

// ─── Ingest (public, rate-limited) ───────────────────────────────────────────

const collectLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many collect requests' },
});

analyticsRouter.post(
  '/collect',
  collectLimit,
  optionalAuthenticate,
  validate({ body: collectBodySchema }),
  asyncHandler(async (req, res) => {
    void processCollect(req.body as ReturnType<typeof collectBodySchema.parse>, req).catch(() => {
      // fire-and-forget, errors are non-fatal
    });
    ApiResponse.success(res, { accepted: true }, 'Accepted');
  }),
);

// ─── Admin read routes ────────────────────────────────────────────────────────

const adminAnalytics = Router();
adminAnalytics.use(
  authenticate,
  authorizeAny(PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW),
);

adminAnalytics.get(
  '/overview',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getOverview(filter);
    ApiResponse.success(res, data, 'Overview');
  }),
);

adminAnalytics.get(
  '/visitors',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const result = await getVisitors(filter);
    ApiResponse.success(res, result.data, 'Visitors', 200, result.meta);
  }),
);

adminAnalytics.get(
  '/sessions',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const result = await getSessions(filter);
    ApiResponse.success(res, result.data, 'Sessions', 200, result.meta);
  }),
);

adminAnalytics.get(
  '/pages',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const result = await getPages(filter);
    ApiResponse.success(res, result.data, 'Pages', 200, result.meta);
  }),
);

adminAnalytics.get(
  '/live',
  asyncHandler(async (_req, res) => {
    const data = await getLiveVisitors();
    ApiResponse.success(res, data, 'Live visitors');
  }),
);

adminAnalytics.get(
  '/events',
  validate({ query: eventsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof eventsFilterSchema.parse>;
    const result = await getEvents(filter);
    ApiResponse.success(res, result.data, 'Events', 200, result.meta);
  }),
);

adminAnalytics.get(
  '/events/names',
  validate({ query: eventsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof eventsFilterSchema.parse>;
    const names = await getEventNames(filter);
    ApiResponse.success(res, names, 'Event names');
  }),
);

adminAnalytics.get(
  '/events/breakdown',
  validate({ query: eventsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof eventsFilterSchema.parse>;
    const data = await getEventBreakdown(filter);
    ApiResponse.success(res, data, 'Event breakdown');
  }),
);

adminAnalytics.get(
  '/devices',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getDeviceBreakdown(filter);
    ApiResponse.success(res, data, 'Device breakdown');
  }),
);

adminAnalytics.get(
  '/geo',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getGeoBreakdown(filter);
    ApiResponse.success(res, data, 'Geo breakdown');
  }),
);

adminAnalytics.get(
  '/traffic',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getTrafficSources(filter);
    ApiResponse.success(res, data, 'Traffic sources');
  }),
);

analyticsRouter.use('/admin', adminAnalytics);
