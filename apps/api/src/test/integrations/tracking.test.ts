import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { appConfig } from '@/config/app.config';

describe('Tracking endpoint', () => {
  const app = createApp();
  const prefix = appConfig.server.apiPrefix;

  it('POST /tracking/event accepts a valid PageView payload', async () => {
    const res = await request(app)
      .post(`${prefix}/tracking/event`)
      .send({ eventName: 'PageView', url: 'https://example.com/' });

    expect([200, 202]).toContain(res.status);
    expect(res.body.data?.accepted).toBe(true);
  });

  it('POST /tracking/event rejects missing eventName', async () => {
    const res = await request(app)
      .post(`${prefix}/tracking/event`)
      .send({ url: 'https://example.com/' });

    expect(res.status).toBe(400);
  });

  it('POST /tracking/event passes with optional userData', async () => {
    const res = await request(app)
      .post(`${prefix}/tracking/event`)
      .send({
        eventName: 'AddToCart',
        customData: { content_ids: ['variant-1'], currency: 'LKR', value: 1500 },
        userData: { email: 'test@example.com', fbp: '_fbp.1.1', fbc: '_fbc.1.1' },
      });

    expect([200, 202]).toContain(res.status);
  });
});
