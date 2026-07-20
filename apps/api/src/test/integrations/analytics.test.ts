import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPii, hashPhone } from '@/utils/pii-hash';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    analytics: {
      meta: { token: 'meta-test-token', pixelId: 'pixel-123', configured: true },
      tiktok: { pixelId: 'tiktok-pix', accessToken: 'tt-token', configured: true },
    },
  },
}));

vi.mock('@/utils/http-retry', () => ({
  fetchWithRetry: vi.fn().mockResolvedValue({ data: { events_received: 1 }, attempts: 1 }),
  HttpRetryError: class HttpRetryError extends Error {},
}));

vi.mock('@/models/analytics.model', () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn();
  const create = vi.fn().mockImplementation((data: Record<string, unknown>) => ({
    ...data,
    _id: 'log-id-1',
    attempts: 0,
    maxAttempts: 3,
    set: setFn,
    save,
  }));
  return {
    AnalyticsEventLogModel: { create },
  };
});

vi.mock('@/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('PII hashing', () => {
  it('normalises email before hashing', () => {
    expect(hashPii('  Test@EXAMPLE.COM  ')).toBe(hashPii('test@example.com'));
  });

  it('returns null for empty strings', () => {
    expect(hashPii('')).toBeNull();
    expect(hashPii(null)).toBeNull();
  });

  it('strips non-numeric chars from phone', () => {
    const h1 = hashPhone('+94-71-123-4567');
    const h2 = hashPhone('+94711234567');
    expect(h1).toBe(h2);
  });
});

describe('MetaCapiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a Purchase event with hashed email', async () => {
    const { MetaCapiService } = await import('@/services/analytics/meta-capi.service');
    const { fetchWithRetry } = await import('@/utils/http-retry');
    const service = new MetaCapiService();

    await service.trackPurchase({
      orderId: 'ORD-001',
      currency: 'LKR',
      value: 5000,
      userData: { email: 'buyer@example.com' },
    });

    expect(fetchWithRetry).toHaveBeenCalledOnce();
    const [url, init] = (fetchWithRetry as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(url).toContain('graph.facebook.com');
    const body = JSON.parse(init.body) as { data: Array<{ user_data?: { em?: string } }> };
    expect(body.data[0].user_data?.em).toBe(hashPii('buyer@example.com'));
  });

  it('sends a Search event', async () => {
    const { MetaCapiService } = await import('@/services/analytics/meta-capi.service');
    const { fetchWithRetry } = await import('@/utils/http-retry');
    const service = new MetaCapiService();

    await service.trackSearch('red dress');
    expect(fetchWithRetry).toHaveBeenCalledOnce();
  });
});

describe('TikTokEventsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends an AddToCart event', async () => {
    const { TikTokEventsService } = await import('@/services/analytics/tiktok-events.service');
    const { fetchWithRetry } = await import('@/utils/http-retry');
    const service = new TikTokEventsService();

    await service.trackAddToCart({
      contentId: 'variant-abc',
      contentName: 'Red Dress',
      currency: 'LKR',
      value: 2500,
    });

    expect(fetchWithRetry).toHaveBeenCalledOnce();
    const [url] = (fetchWithRetry as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('business-api.tiktok.com');
  });

  it('sends CompletePayment for purchase', async () => {
    const { TikTokEventsService } = await import('@/services/analytics/tiktok-events.service');
    const { fetchWithRetry } = await import('@/utils/http-retry');
    const service = new TikTokEventsService();

    await service.trackPurchase({
      orderId: 'ORD-123',
      currency: 'LKR',
      value: 8000,
    });

    const [, init] = (fetchWithRetry as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    const body = JSON.parse(init.body) as { event: string };
    expect(body.event).toBe('CompletePayment');
  });
});
