import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPii, hashPhone } from '@/utils/pii-hash.js';
import { hashMetaPii } from '@/services/analytics/meta-param-builder.js';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    analytics: {
      meta: { token: 'meta-test-token', pixelId: 'pixel-123', configured: true },
      tiktok: { pixelId: 'tiktok-pix', accessToken: 'tt-token', configured: true },
    },
    cors: { origins: ['http://localhost:5173'] },
    email: { shopUrl: 'http://localhost:5173' },
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
    const { MetaCapiService } = await import('@/services/analytics/meta-capi.service.js');
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
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
    expect(body.data[0].user_data?.em).toBe(hashMetaPii('buyer@example.com', 'email'));
    expect(String(body.data[0].user_data?.em)).toMatch(/^[a-f0-9]{64}(\.[A-Za-z0-9]+)?$/);
  });

  it('sends CompleteRegistration with hashed PII and unhashed fbc/fbp', async () => {
    const { MetaCapiService } = await import('@/services/analytics/meta-capi.service.js');
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
    const service = new MetaCapiService();

    await service.trackCompleteRegistration({
      email: 'new@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      fbc: 'fb.1.1554763741205.AbCdEf',
      fbp: 'fb.1.1554763741205.1234567890',
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.10',
      externalId: 'cust_123',
      city: '',
      zip: null,
    });

    const [, init] = (fetchWithRetry as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    const body = JSON.parse(init.body) as {
      data: Array<{
        event_name: string;
        user_data?: Record<string, unknown>;
      }>;
    };
    const userData = body.data[0]?.user_data ?? {};
    expect(body.data[0]?.event_name).toBe('CompleteRegistration');
    expect(userData.em).toBe(hashMetaPii('new@example.com', 'email'));
    expect(userData.fn).toBe(hashMetaPii('Ada', 'first_name'));
    expect(userData.ln).toBe(hashMetaPii('Lovelace', 'last_name'));
    expect(userData.fbc).toBe('fb.1.1554763741205.AbCdEf');
    expect(userData.fbp).toBe('fb.1.1554763741205.1234567890');
    expect(userData.client_user_agent).toBe('Mozilla/5.0');
    expect(userData.client_ip_address).toBe('203.0.113.10');
    expect(userData.ct).toBeUndefined();
    expect(userData.zp).toBeUndefined();
    expect(userData.db).toBeUndefined();
    expect(userData.st).toBeUndefined();
  });

  it('sends a Search event', async () => {
    const { MetaCapiService } = await import('@/services/analytics/meta-capi.service.js');
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
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
    const { TikTokEventsService } = await import('@/services/analytics/tiktok-events.service.js');
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
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
    const { TikTokEventsService } = await import('@/services/analytics/tiktok-events.service.js');
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
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
