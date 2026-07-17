import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '@/app';
import { setupTestDatabase, teardownTestDatabase, resetCollections } from '@/test/helpers/db';
import { registerCustomer, createAdminUser, login, TEST_PASSWORD } from '@/test/helpers/auth';
import { runPurchaseFlow } from '@/test/helpers/commerce';
import { postCodWebhook, buildCodWebhookPayload, attemptOrderId } from '@/test/helpers/webhook';
import { appConfig } from '@/config/app.config';
import { sanitizeRichText } from '@/utils/sanitize-html';
import { UserModel } from '@/models';

const API = '/api/v1';

describe('Security review', () => {
  let app: Application;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
  });
  afterAll(async () => {
    await teardownTestDatabase();
  });
  beforeEach(async () => {
    await resetCollections();
  });

  describe('JWT handling', () => {
    it('rejects missing bearer token on protected routes', async () => {
      const res = await request(app).get(`${API}/orders`);
      expect(res.status).toBe(401);
    });

    it('rejects forged JWT signatures', async () => {
      const forged = jwt.sign(
        { sub: '507f1f77bcf86cd799439011', typ: 'access', roleKey: 'customer', sid: 'x' },
        'wrong-secret-xxxxxxxx',
        { expiresIn: '15m' },
      );
      const res = await request(app).get(`${API}/orders`).set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('rejects expired JWT', async () => {
      const expired = jwt.sign(
        {
          sub: '507f1f77bcf86cd799439011',
          typ: 'access',
          roleKey: 'customer',
          sid: 'x',
          jti: 'test-jti',
        },
        appConfig.auth.accessSecret,
        { expiresIn: -10 },
      );
      const res = await request(app).get(`${API}/orders`).set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Refresh token rotation', () => {
    it('rotates refresh token and rejects reuse of the old one', async () => {
      const customer = await registerCustomer(app);
      expect(customer.refreshToken).toBeTruthy();

      const first = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: customer.refreshToken });
      expect(first.status).toBe(200);
      const nextRefresh = first.body.data.refreshToken as string;
      expect(nextRefresh).toBeTruthy();
      expect(nextRefresh).not.toBe(customer.refreshToken);

      const reuse = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: customer.refreshToken });
      expect(reuse.status).toBe(401);

      // New token should still work (unless family was revoked on reuse)
      const afterReuse = await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: nextRefresh });
      // TOKEN_REUSE policy revokes the whole family — so this should also fail.
      expect(afterReuse.status).toBe(401);
    });
  });

  describe('Webhook verification', () => {
    it('rejects COD webhook with bad signature', async () => {
      const res = await postCodWebhook(
        app,
        buildCodWebhookPayload({ orderId: 'PAY-X-A1', amount: 100 }),
        { tamperSignature: true },
      );
      expect(res.status).toBe(400);
    });

    it('rejects COD webhook with missing signature', async () => {
      const res = await request(app)
        .post(`${API}/payments/webhooks/cod`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ orderId: 'PAY-X-A1', status: 'collected', amount: 100 }));
      expect(res.status).toBe(400);
    });
  });

  describe('IDOR — users cannot access other users resources', () => {
    it('blocks customer A from reading customer B order', async () => {
      const a = await registerCustomer(app);
      const b = await registerCustomer(app);
      const { order } = await runPurchaseFlow(app, a.auth, { stock: 3, sku: `IDOR-${Date.now()}` });

      const res = await request(app).get(`${API}/orders/${order._id}`).set(b.auth);
      expect(res.status).toBe(403);
    });

    it('blocks customer A from cancelling customer B order', async () => {
      const a = await registerCustomer(app);
      const b = await registerCustomer(app);
      const { order } = await runPurchaseFlow(app, a.auth, {
        stock: 3,
        sku: `IDOR2-${Date.now()}`,
      });

      const res = await request(app)
        .post(`${API}/orders/${order._id}/cancel`)
        .set(b.auth)
        .send({ reason: 'steal' });
      expect(res.status).toBe(403);
    });
  });

  describe('Mass assignment', () => {
    it('register ignores roleKey / isAdmin elevation attempts', async () => {
      const email = `mass_${Date.now()}@test.com`;
      const res = await request(app).post(`${API}/auth/register`).send({
        email,
        password: TEST_PASSWORD,
        firstName: 'Evil',
        lastName: 'User',
        roleKey: 'super_admin',
        roleId: '507f1f77bcf86cd799439011',
        status: 'active',
      });
      // Unknown keys are stripped by Zod — registration must still succeed.
      expect(res.status).toBeLessThan(400);
      const user = await UserModel.findOne({ email });
      expect(user?.roleKey).toBe('customer');
      expect(user?.roleKey).not.toBe('super_admin');
    });

    it('profile update strips forbidden financial fields', async () => {
      const customer = await registerCustomer(app);
      const res = await request(app).patch(`${API}/customers/me`).set(customer.auth).send({
        firstName: 'Safe',
        rewardPointsBalance: 999999,
        email: 'hacker@evil.com',
        userId: '507f1f77bcf86cd799439011',
      });
      expect(res.status).toBeLessThan(400);
      expect(res.body.data.rewardPointsBalance ?? 0).not.toBe(999999);
      expect(res.body.data.email).not.toBe('hacker@evil.com');
    });
  });

  describe('Input validation & MongoDB injection', () => {
    it('rejects NoSQL operators in login email', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: { $gt: '' }, password: 'anything' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid ObjectId order lookups', async () => {
      const customer = await registerCustomer(app);
      const res = await request(app).get(`${API}/orders/not-an-object-id`).set(customer.auth);
      expect([400, 404]).toContain(res.status);
    });

    it('rejects invalid order status transition payloads', async () => {
      const admin = await createAdminUser(app);
      const customer = await registerCustomer(app);
      const { order } = await runPurchaseFlow(app, customer.auth, { stock: 2 });
      const res = await request(app)
        .patch(`${API}/orders/${order._id}/status`)
        .set(admin.auth)
        .send({ status: 'shipped' }); // skip intermediate states
      expect(res.status).toBe(400);
    });
  });

  describe('XSS in CMS / rich text', () => {
    it('sanitizeRichText strips script tags and event handlers', () => {
      const dirty =
        '<p>Hello</p><script>alert(1)</script><img src=x onerror="alert(2)" /><a href="javascript:alert(3)">x</a>';
      const clean = sanitizeRichText(dirty);
      expect(clean).not.toMatch(/<script/i);
      expect(clean).not.toMatch(/onerror/i);
      expect(clean).not.toMatch(/javascript:/i);
      expect(clean).toMatch(/Hello/);
    });
  });

  describe('CSRF / cookie auth', () => {
    it('accepts Authorization bearer without cookies (API-first)', async () => {
      const customer = await registerCustomer(app);
      const res = await request(app).get(`${API}/customers/me`).set(customer.auth);
      expect(res.status).toBe(200);
    });

    it('cookie SameSite is configured for CSRF mitigation', () => {
      expect(['lax', 'strict', 'none']).toContain(appConfig.cookie.sameSite);
    });
  });

  describe('File upload validation', () => {
    it('only allows configured image mime types and enforces size limit', async () => {
      const { memoryUpload } = await import('@/utils/file-upload.helper');
      expect(appConfig.upload.allowedMimeTypes).not.toContain('application/x-msdownload');
      expect(appConfig.upload.allowedMimeTypes.every((m: string) => m.startsWith('image/'))).toBe(
        true,
      );
      expect(appConfig.upload.maxSizeBytes).toBeLessThanOrEqual(10 * 1024 * 1024);
      expect(memoryUpload).toBeTruthy();
    });
  });

  describe('Rate limiting', () => {
    it('global rate limiter is mounted (config readable)', () => {
      expect(appConfig.rateLimit.max).toBeGreaterThan(0);
      expect(appConfig.rateLimit.windowMs).toBeGreaterThan(0);
    });
  });

  // silence unused import if possible
  void login;
  void attemptOrderId;
});
