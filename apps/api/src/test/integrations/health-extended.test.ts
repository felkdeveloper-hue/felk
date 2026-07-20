import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { appConfig } from '@/config/app.config';

describe('Health check — integration fields', () => {
  const app = createApp();
  const prefix = appConfig.server.apiPrefix;

  it('GET /health/ready includes integration checks', async () => {
    const res = await request(app).get(`${prefix}/health/ready`);

    expect([200, 503]).toContain(res.status);
    const checks = res.body.data?.checks;
    expect(checks).toBeDefined();
    expect(checks.smtp).toBeDefined();
    expect(checks.payhere).toBeDefined();
    expect(checks.koko).toBeDefined();
    expect(checks.mintpay).toBeDefined();
    expect(checks.meta).toBeDefined();
    expect(checks.tiktok).toBeDefined();
  });

  it('gateway checks have ok boolean', async () => {
    const res = await request(app).get(`${prefix}/health/ready`);
    const checks = res.body.data?.checks;
    expect(typeof checks.payhere.ok).toBe('boolean');
    expect(typeof checks.koko.ok).toBe('boolean');
    expect(typeof checks.mintpay.ok).toBe('boolean');
    expect(typeof checks.meta.ok).toBe('boolean');
    expect(typeof checks.tiktok.ok).toBe('boolean');
  });
});
