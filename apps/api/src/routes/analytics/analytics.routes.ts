import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '@/middlewares/validate.middleware.js';
import { authenticate, authorizeAny, optionalAuthenticate } from '@/middlewares/auth.middleware.js';
import { PERMISSIONS } from '@/constants/permissions.js';
import { HTTP_STATUS } from '@/constants/http.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import {
  collectBodySchema,
  analyticsFilterSchema,
  eventsFilterSchema,
  createExportBodySchema,
  saveDashboardLayoutBodySchema,
  applyTemplateBodySchema,
  importLayoutBodySchema,
  duplicateLayoutBodySchema,
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
  getProductAnalytics,
  getProductInterest,
  getCartAnalytics,
  getWishlistAnalytics,
  getPaymentRecovery,
  getReturningJourney,
  getCustomerTimeline,
  getSessionReplay,
  getSearchAnalytics,
  getProductFunnel,
  getCheckoutAbandonAnalytics,
  getProductInsights,
  getRevenueDashboard,
  getActivityFeed,
  createAnalyticsExport,
  listExportHistory,
  downloadExportJob,
  getExportJobForUser,
  listExportReports,
  getDashboardLayout,
  saveDashboardLayout,
  applyDashboardTemplate,
  resetDashboardLayout,
  duplicateDashboardLayout,
  importDashboardLayout,
  getDashboardCatalog,
} from '@/services/platform-analytics/index.js';
import {
  getMetaAdsPerformance,
  getAdsReconciliation,
  syncMetaAdsInsights,
} from '@/services/analytics/meta-ads-sync.service.js';

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

adminAnalytics.get(
  '/ads/meta',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getMetaAdsPerformance(filter);
    ApiResponse.success(res, data, 'Meta ads performance');
  }),
);

adminAnalytics.post(
  '/ads/meta/sync',
  asyncHandler(async (_req, res) => {
    const data = await syncMetaAdsInsights({ recentDays: 7 });
    if (data.skipped) {
      ApiResponse.success(res, data, data.reason ?? 'Sync skipped');
      return;
    }
    if (!data.ok) {
      throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, data.error ?? 'Meta ads sync failed');
    }
    ApiResponse.success(res, data, 'Meta ads synced');
  }),
);

adminAnalytics.get(
  '/ads/reconcile',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getAdsReconciliation(filter);
    ApiResponse.success(res, data, 'Ads reconciliation');
  }),
);

adminAnalytics.get(
  '/products',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getProductAnalytics(filter);
    ApiResponse.success(res, data, 'Product analytics');
  }),
);

adminAnalytics.get(
  '/products/:productId/interest',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getProductInterest(String(req.params.productId), filter);
    ApiResponse.success(res, data, 'Product interest');
  }),
);

adminAnalytics.get(
  '/products/:productId/insights',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getProductInsights(String(req.params.productId), filter);
    ApiResponse.success(res, data, 'Product insights');
  }),
);

adminAnalytics.get(
  '/search',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getSearchAnalytics(filter);
    ApiResponse.success(res, data, 'Search analytics');
  }),
);

adminAnalytics.get(
  '/funnel',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getProductFunnel(filter);
    ApiResponse.success(res, data, 'Product funnel');
  }),
);

adminAnalytics.get(
  '/checkout',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getCheckoutAbandonAnalytics(filter);
    ApiResponse.success(res, data, 'Checkout abandon analytics');
  }),
);

adminAnalytics.get(
  '/revenue',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getRevenueDashboard(filter);
    ApiResponse.success(res, data, 'Revenue dashboard');
  }),
);

adminAnalytics.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const data = await getActivityFeed(limit);
    ApiResponse.success(res, data, 'Activity feed');
  }),
);

adminAnalytics.get(
  '/cart',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getCartAnalytics(filter);
    ApiResponse.success(res, data, 'Cart analytics');
  }),
);

adminAnalytics.get(
  '/wishlist',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getWishlistAnalytics(filter);
    ApiResponse.success(res, data, 'Wishlist analytics');
  }),
);

adminAnalytics.get(
  '/recovery',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getPaymentRecovery(filter);
    ApiResponse.success(res, data, 'Payment recovery');
  }),
);

adminAnalytics.get(
  '/returning',
  validate({ query: analyticsFilterSchema }),
  asyncHandler(async (req, res) => {
    const filter = req.query as ReturnType<typeof analyticsFilterSchema.parse>;
    const data = await getReturningJourney(filter);
    ApiResponse.success(res, data, 'Returning journey');
  }),
);

adminAnalytics.get(
  '/customers/:userId/timeline',
  asyncHandler(async (req, res) => {
    const data = await getCustomerTimeline(String(req.params.userId));
    ApiResponse.success(res, data, 'Customer timeline');
  }),
);

adminAnalytics.get(
  '/sessions/:sessionId/replay',
  asyncHandler(async (req, res) => {
    const data = await getSessionReplay(String(req.params.sessionId));
    ApiResponse.success(res, data, 'Session replay');
  }),
);

// ─── Universal export engine ──────────────────────────────────────────────────

adminAnalytics.get(
  '/exports/reports',
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, listExportReports(), 'Export reports');
  }),
);

adminAnalytics.get(
  '/exports',
  authorizeAny(PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const userId = String(req.user!.id);
    const rows = await listExportHistory(userId);
    ApiResponse.success(
      res,
      rows.map((j) => ({
        id: String(j._id),
        reportType: j.reportType,
        reportTitle: j.reportTitle,
        format: j.format,
        status: j.status,
        recordCount: j.recordCount,
        fileName: j.fileName,
        error: j.error,
        drillLabel: j.drillLabel,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        expiresAt: j.expiresAt,
        downloadAvailable: j.status === 'ready',
      })),
      'Export history',
    );
  }),
);

adminAnalytics.get(
  '/exports/:id',
  authorizeAny(PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const job = await getExportJobForUser(String(req.params.id), String(req.user!.id));
    if (!job) {
      throw ApiError.notFound('Export not found');
    }
    ApiResponse.success(
      res,
      {
        id: String(job._id),
        reportType: job.reportType,
        reportTitle: job.reportTitle,
        format: job.format,
        status: job.status,
        recordCount: job.recordCount,
        fileName: job.fileName,
        error: job.error,
        drillLabel: job.drillLabel,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        expiresAt: job.expiresAt,
        downloadAvailable: job.status === 'ready',
      },
      'Export job',
    );
  }),
);

adminAnalytics.get(
  '/exports/:id/download',
  authorizeAny(PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW),
  asyncHandler(async (req, res) => {
    const file = await downloadExportJob(String(req.params.id), String(req.user!.id));
    if (!file) {
      throw ApiError.notFound('Export not ready or not found');
    }
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    res.send(file.buffer);
  }),
);

adminAnalytics.post(
  '/exports',
  authorizeAny(PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW),
  validate({ body: createExportBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof createExportBodySchema.parse>;
    const result = await createAnalyticsExport(body, {
      userId: String(req.user!.id),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (result.async) {
      return ApiResponse.success(
        res,
        {
          async: true as const,
          jobId: result.jobId,
          status: result.status,
        },
        'Export queued',
        HTTP_STATUS.ACCEPTED,
      );
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName.replace(/"/g, '')}"`,
    );
    res.setHeader('X-Record-Count', String(result.recordCount));
    res.setHeader('X-Report-Title', result.reportTitle);
    res.send(result.buffer);
  }),
);

// ─── Personalized dashboard layouts ───────────────────────────────────────────

adminAnalytics.get(
  '/dashboard/catalog',
  asyncHandler(async (req, res) => {
    const perms = (req.user?.permissions ?? []) as string[];
    ApiResponse.success(res, getDashboardCatalog(perms), 'Dashboard catalog');
  }),
);

adminAnalytics.get(
  '/dashboard/layout',
  asyncHandler(async (req, res) => {
    const userId = String(req.user!.id);
    const roleKey = String(req.user!.roleKey ?? 'admin');
    const data = await getDashboardLayout(userId, roleKey);
    ApiResponse.success(res, data, 'Dashboard layout');
  }),
);

adminAnalytics.put(
  '/dashboard/layout',
  validate({ body: saveDashboardLayoutBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof saveDashboardLayoutBodySchema.parse>;
    const data = await saveDashboardLayout(
      String(req.user!.id),
      String(req.user!.roleKey ?? 'admin'),
      {
        layoutKey: body.layoutKey,
        activeKey: body.activeKey,
        widgets: body.widgets,
        theme: body.theme,
      },
    );
    ApiResponse.success(res, data, 'Dashboard layout saved');
  }),
);

adminAnalytics.post(
  '/dashboard/layout/reset',
  asyncHandler(async (req, res) => {
    const data = await resetDashboardLayout(
      String(req.user!.id),
      String(req.user!.roleKey ?? 'admin'),
    );
    ApiResponse.success(res, data, 'Dashboard reset to role default');
  }),
);

adminAnalytics.post(
  '/dashboard/layout/template',
  validate({ body: applyTemplateBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof applyTemplateBodySchema.parse>;
    const data = await applyDashboardTemplate(
      String(req.user!.id),
      String(req.user!.roleKey ?? 'admin'),
      body.templateId,
      body.overwritePersonal,
    );
    ApiResponse.success(res, data, 'Template applied');
  }),
);

adminAnalytics.post(
  '/dashboard/layout/duplicate',
  validate({ body: duplicateLayoutBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof duplicateLayoutBodySchema.parse>;
    try {
      const data = await duplicateDashboardLayout(
        String(req.user!.id),
        String(req.user!.roleKey ?? 'admin'),
        body.fromKey,
        body.toKey,
        body.setActive,
      );
      ApiResponse.success(res, data, 'Layout duplicated');
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 404) throw ApiError.notFound(e.message);
      throw err;
    }
  }),
);

adminAnalytics.post(
  '/dashboard/layout/import',
  validate({ body: importLayoutBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof importLayoutBodySchema.parse>;
    const data = await importDashboardLayout(
      String(req.user!.id),
      String(req.user!.roleKey ?? 'admin'),
      body.layoutKey ?? 'personal',
      body.snapshot,
      body.setActive,
    );
    ApiResponse.success(res, data, 'Layout imported');
  }),
);

adminAnalytics.get(
  '/dashboard/layout/export',
  asyncHandler(async (req, res) => {
    const data = await getDashboardLayout(
      String(req.user!.id),
      String(req.user!.roleKey ?? 'admin'),
    );
    const key = String(req.query.key ?? data.activeKey);
    const snap = data.layouts[key] ?? { widgets: data.widgets, theme: data.theme };
    ApiResponse.success(
      res,
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        layoutKey: key,
        snapshot: snap,
      },
      'Layout export',
    );
  }),
);

analyticsRouter.use('/admin', adminAnalytics);
