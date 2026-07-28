import { logger } from '@/config/logger';
import { EmailLogModel } from '@/models/email-log.model';
import { AnalyticsEventLogModel } from '@/models/analytics.model';
import { sweepPending, type RetrySweepDoc } from '@/services/retry-sweep.service';
import { PRODUCT_STATUS, PRODUCT_VISIBILITY } from '@/constants/product';
import { productService } from '@/services/product.service';
import { getCached, setCache, storefrontProductsCacheKey } from '@/utils/simple-cache';

const EMAIL_SWEEP_INTERVAL_MS = 60_000;
const ANALYTICS_SWEEP_INTERVAL_MS = 60_000;
/** Keep storefront product lists warm so Vercel SPAs do not hit a cold Mongo path. */
const STOREFRONT_WARMUP_INTERVAL_MS = 4 * 60_000;

let emailSweepTimer: ReturnType<typeof setInterval> | null = null;
let analyticsSweepTimer: ReturnType<typeof setInterval> | null = null;
let storefrontWarmupTimer: ReturnType<typeof setInterval> | null = null;

async function runEmailSweep() {
  try {
    const { emailQueueService } = await import('@/services/email-queue.service');
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
    const { analyticsService } = await import('@/services/analytics/analytics.service');
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

export function startCronJobs(): void {
  logger.info('Cron: starting retry sweep jobs');

  emailSweepTimer = setInterval(() => {
    void runEmailSweep();
  }, EMAIL_SWEEP_INTERVAL_MS);

  analyticsSweepTimer = setInterval(() => {
    void runAnalyticsSweep();
  }, ANALYTICS_SWEEP_INTERVAL_MS);

  storefrontWarmupTimer = setInterval(() => {
    void runStorefrontWarmup();
  }, STOREFRONT_WARMUP_INTERVAL_MS);

  // Run once shortly after startup
  setTimeout(() => void runEmailSweep(), 5_000);
  setTimeout(() => void runAnalyticsSweep(), 5_000);
  setTimeout(() => void runStorefrontWarmup(), 8_000);
}

export function stopCronJobs(): void {
  if (emailSweepTimer) clearInterval(emailSweepTimer);
  if (analyticsSweepTimer) clearInterval(analyticsSweepTimer);
  if (storefrontWarmupTimer) clearInterval(storefrontWarmupTimer);
  emailSweepTimer = null;
  analyticsSweepTimer = null;
  storefrontWarmupTimer = null;
  logger.info('Cron: retry sweep jobs stopped');
}
