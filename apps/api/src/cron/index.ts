import { logger } from '@/config/logger.js';
import { EmailLogModel } from '@/models/email-log.model.js';
import { AnalyticsEventLogModel } from '@/models/analytics.model.js';
import { sweepPending, type RetrySweepDoc } from '@/services/retry-sweep.service.js';
import { PRODUCT_STATUS, PRODUCT_VISIBILITY } from '@/constants/product.js';
import { productService } from '@/services/product.service.js';
import { reservationService } from '@/services/reservation.service.js';
import { checkoutService } from '@/services/checkout.service.js';
import { getCached, setCache, storefrontProductsCacheKey } from '@/utils/simple-cache.js';

const EMAIL_SWEEP_INTERVAL_MS = 60_000;
const ANALYTICS_SWEEP_INTERVAL_MS = 60_000;
const RESERVATION_SWEEP_INTERVAL_MS = 60_000;
/** Keep storefront product lists warm so Vercel SPAs do not hit a cold Mongo path. */
const STOREFRONT_WARMUP_INTERVAL_MS = 4 * 60_000;
const PAYMENT_ORDER_SYNC_INTERVAL_MS = 2 * 60_000;

let emailSweepTimer: ReturnType<typeof setInterval> | null = null;
let analyticsSweepTimer: ReturnType<typeof setInterval> | null = null;
let reservationSweepTimer: ReturnType<typeof setInterval> | null = null;
let storefrontWarmupTimer: ReturnType<typeof setInterval> | null = null;
let paymentOrderSyncTimer: ReturnType<typeof setInterval> | null = null;
let metaAdsSyncTimer: ReturnType<typeof setInterval> | null = null;

async function runEmailSweep() {
  try {
    const { emailQueueService } = await import('@/services/email-queue.service.js');
    await sweepPending(
      EmailLogModel as unknown as Parameters<typeof sweepPending>[0],
      async (doc: RetrySweepDoc) => {
        const emailDoc = doc as RetrySweepDoc & {
          to: string;
          subject: string;
          html: string | null;
          text: string | null;
          set: (key: string, val: unknown) => void;
        };
        await emailQueueService.sendFromLog(emailDoc);
      },
      'EmailQueue',
    );
  } catch (err) {
    logger.error({ err }, 'Email sweep error');
  }
}

async function runAnalyticsSweep() {
  try {
    const { analyticsService } = await import('@/services/analytics/analytics.service.js');
    await sweepPending(
      AnalyticsEventLogModel as unknown as Parameters<typeof sweepPending>[0],
      async (doc: RetrySweepDoc) => {
        const analyticsDoc = doc as RetrySweepDoc & { provider: string; payload: unknown };
        await analyticsService.retryEventLog(analyticsDoc);
      },
      'AnalyticsQueue',
    );
  } catch (err) {
    logger.error({ err }, 'Analytics sweep error');
  }
}

async function runStorefrontWarmup() {
  try {
    const warmQueries = [
      { gender: 'women', page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' },
      { page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc' },
    ] as const;

    await Promise.all(
      warmQueries.map(async (query) => {
        const cacheKey = storefrontProductsCacheKey(query as unknown as Record<string, unknown>);
        if (getCached(cacheKey)) return;
        const result = await productService.list({
          ...query,
          includeDeleted: false,
          status: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.OUT_OF_STOCK],
          excludeVisibility: [PRODUCT_VISIBILITY.HIDDEN],
        } as never);
        setCache(cacheKey, { data: result.data, meta: result.meta }, 300_000);
      }),
    );
  } catch (err) {
    logger.error({ err }, 'Storefront warmup error');
  }
}

async function runReservationSweep() {
  try {
    const [reservations, checkouts] = await Promise.all([
      reservationService.expireDue({}),
      checkoutService.expireDueSessions({}),
    ]);
    if (reservations.processed || checkouts.released) {
      logger.info(
        { reservations: reservations.processed, checkouts: checkouts.released },
        'Cron: expired payment-window inventory holds',
      );
    }
  } catch (err) {
    logger.error({ err }, 'Reservation sweep error');
  }
}

async function runPaymentOrderSync() {
  try {
    const {
      catchUpOrphanPaidGatewayPayments,
      recoverConfirmedKokoOrders,
      voidUnverifiedKokoAutoOrders,
    } = await import('@/services/order-payment-consumer.service.js');
    const { paymentService } = await import('@/services/payment.service.js');
    const voided = await voidUnverifiedKokoAutoOrders();
    const replayed = await paymentService.replayUnprocessedKokoWebhooks();
    const open = await paymentService.reconcileOpenGatewayPayments();
    const koko = await recoverConfirmedKokoOrders();
    const orphan = await catchUpOrphanPaidGatewayPayments();
    if (
      orphan.created > 0 ||
      open.paid > 0 ||
      replayed.paid > 0 ||
      koko.recovered.length > 0 ||
      voided.voided.length > 0
    ) {
      logger.info(
        {
          orphanCreated: orphan.created,
          gatewayPaid: open.paid,
          kokoReplayed: replayed.paid,
          kokoRecovered: koko.recovered.length,
          kokoVoided: voided.voided,
          kokoOrders: koko.recovered.map((row) => ({
            referenceNumber: row.referenceNumber,
            orderNumber: row.orderNumber,
            amount: row.amount,
          })),
        },
        'Cron: synced captured gateway payments into admin orders',
      );
    }
  } catch (err) {
    logger.error({ err }, 'Payment-order sync error');
  }
}

async function runMetaAdsSync() {
  try {
    const { runScheduledMetaAdsSync } =
      await import('@/services/analytics/meta-ads-sync.service.js');
    const result = await runScheduledMetaAdsSync();
    if (result.skipped) {
      logger.debug({ reason: result.reason }, 'Meta ads sync skipped');
      return;
    }
    if (!result.ok) {
      logger.warn({ error: result.error }, 'Meta ads sync completed with error');
      return;
    }
    logger.info(
      { since: result.since, until: result.until, rows: result.rowsUpserted },
      'Cron: Meta ads insights synced',
    );
  } catch (err) {
    logger.error({ err }, 'Meta ads sync error');
  }
}

export function startCronJobs(): void {
  logger.info('Cron: starting retry sweep jobs');

  emailSweepTimer = setInterval(() => {
    void runEmailSweep();
  }, EMAIL_SWEEP_INTERVAL_MS);

  analyticsSweepTimer = setInterval(() => {
    void runAnalyticsSweep();
  }, ANALYTICS_SWEEP_INTERVAL_MS);

  reservationSweepTimer = setInterval(() => {
    void runReservationSweep();
  }, RESERVATION_SWEEP_INTERVAL_MS);

  storefrontWarmupTimer = setInterval(() => {
    void runStorefrontWarmup();
  }, STOREFRONT_WARMUP_INTERVAL_MS);

  paymentOrderSyncTimer = setInterval(() => {
    void runPaymentOrderSync();
  }, PAYMENT_ORDER_SYNC_INTERVAL_MS);

  // Interval from env (default 6h). Dynamic import keeps startup light when Meta ads unset.
  void import('@/config/app.config.js').then(({ appConfig }) => {
    const hours = appConfig.analytics.metaAds.syncIntervalHours;
    const intervalMs = hours * 60 * 60 * 1000;
    metaAdsSyncTimer = setInterval(() => {
      void runMetaAdsSync();
    }, intervalMs);
    // First sync ~2 min after boot (after DB is warm)
    setTimeout(() => void runMetaAdsSync(), 120_000);
  });

  // Run once shortly after startup
  setTimeout(() => void runEmailSweep(), 5_000);
  setTimeout(() => void runAnalyticsSweep(), 5_000);
  setTimeout(() => void runReservationSweep(), 6_000);
  setTimeout(() => void runStorefrontWarmup(), 8_000);
  setTimeout(() => void runPaymentOrderSync(), 20_000);
}

export function stopCronJobs(): void {
  if (emailSweepTimer) clearInterval(emailSweepTimer);
  if (analyticsSweepTimer) clearInterval(analyticsSweepTimer);
  if (reservationSweepTimer) clearInterval(reservationSweepTimer);
  if (storefrontWarmupTimer) clearInterval(storefrontWarmupTimer);
  if (paymentOrderSyncTimer) clearInterval(paymentOrderSyncTimer);
  if (metaAdsSyncTimer) clearInterval(metaAdsSyncTimer);
  emailSweepTimer = null;
  analyticsSweepTimer = null;
  reservationSweepTimer = null;
  storefrontWarmupTimer = null;
  paymentOrderSyncTimer = null;
  metaAdsSyncTimer = null;
  logger.info('Cron: retry sweep jobs stopped');
}
