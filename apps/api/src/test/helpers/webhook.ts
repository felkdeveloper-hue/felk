import { createHmac } from 'node:crypto';
import type { Application } from 'express';
import request from 'supertest';

const API = '/api/v1';
const SECRET = process.env.COD_WEBHOOK_SECRET ?? 'test-cod-webhook-secret';

export function signCodBody(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

export function buildCodWebhookPayload(input: {
  orderId: string;
  amount: number;
  currency?: string;
  status?: string;
  collectionId?: string;
}) {
  return {
    orderId: input.orderId,
    status: input.status ?? 'collected',
    amount: input.amount,
    currency: input.currency ?? 'LKR',
    collectionId: input.collectionId ?? `col_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
}

export async function postCodWebhook(
  app: Application,
  payload: Record<string, unknown>,
  opts: { tamperSignature?: boolean } = {},
) {
  const body = JSON.stringify(payload);
  const signature = opts.tamperSignature ? 'deadbeef' : signCodBody(body);
  return request(app)
    .post(`${API}/payments/webhooks/cod`)
    .set('Content-Type', 'application/json')
    .set('x-cod-signature', signature)
    .send(body);
}

/** COD attempt order id format used by Payment Engine. */
export function attemptOrderId(referenceNumber: string, attemptNumber = 1) {
  return `${referenceNumber}-A${attemptNumber}`;
}
