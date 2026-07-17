import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { appConfig } from '@/config/app.config';

describe('System health endpoints', () => {
  const app = createApp();
  const prefix = appConfig.server.apiPrefix;

  it('GET /health returns liveness payload', async () => {
    const response = await request(app).get(`${prefix}/health`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-correlation-id']).toBeTruthy();
  });

  it('GET /health/live aliases liveness', async () => {
    const response = await request(app).get(`${prefix}/health/live`);
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /health/ready returns dependency checks', async () => {
    const response = await request(app).get(`${prefix}/health/ready`);

    expect([200, 503]).toContain(response.status);
    expect(response.body.data.checks).toBeDefined();
    expect(response.body.data.checks.mongodb).toBeDefined();
    expect(response.body.data.checks.redis).toBeDefined();
  });

  it('GET /metrics returns runtime stats', async () => {
    const response = await request(app).get(`${prefix}/metrics`);

    expect(response.status).toBe(200);
    expect(response.body.data.uptimeSeconds).toBeTypeOf('number');
    expect(response.body.data.memory).toBeDefined();
  });

  it('includes requestId in error responses', async () => {
    const response = await request(app).get(`${prefix}/unknown-route`);

    expect(response.status).toBe(404);
    expect(response.body.meta?.requestId).toBeTruthy();
  });
});
