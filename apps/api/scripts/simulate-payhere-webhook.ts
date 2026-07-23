/**
 * One-off: simulate PayHere notify webhook for a known payment reference.
 * Usage: npx pnpm --filter @fe-platform/api exec tsx scripts/simulate-payhere-webhook.ts PAY-XXX
 */
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    try {
      const raw = readFileSync(file, 'utf8');
      const env: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 0) continue;
        let v = t.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = v;
      }
      if (env.MONGODB_URI) return env;
    } catch {
      /* next */
    }
  }
  throw new Error('Could not load .env');
}

function md5(s: string) {
  return createHash('md5').update(s).digest('hex').toUpperCase();
}

const ref = process.argv[2];
if (!ref) {
  console.error('Usage: tsx scripts/simulate-payhere-webhook.ts <paymentReference>');
  process.exit(2);
}

const env = loadEnv();
await mongoose.connect(env.MONGODB_URI);
const payment = await mongoose.connection.db!.collection('payments').findOne({
  referenceNumber: ref,
});
if (!payment) {
  console.error('Payment not found:', ref);
  process.exit(1);
}
const attempt = await mongoose.connection
  .db!.collection('payment_attempts')
  .findOne({ paymentId: payment._id }, { sort: { attemptNumber: -1 } });
if (!attempt?.gatewayPaymentId) {
  console.error('No payment attempt / gatewayPaymentId');
  process.exit(1);
}

const orderId = String(attempt.gatewayPaymentId);
const amount = Number(payment.amount).toFixed(2);
const currency = String(payment.currency);
const merchantId = env.PAYHERE_MERCHANT_ID;
const secretHash = md5(env.PAYHERE_MERCHANT_SECRET);
const statusCode = '2';
const md5sig = md5(`${merchantId}${orderId}${amount}${currency}${statusCode}${secretHash}`);
const body = new URLSearchParams({
  merchant_id: merchantId,
  order_id: orderId,
  payhere_amount: amount,
  payhere_currency: currency,
  status_code: statusCode,
  payment_id: '320099988877',
  md5sig,
}).toString();

const res = await fetch('http://127.0.0.1:4000/api/v1/payments/webhooks/payhere', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
const json = await res.json();
const updated = await mongoose.connection.db!.collection('payments').findOne({ _id: payment._id });
console.log(
  JSON.stringify(
    {
      http: res.status,
      webhook: json,
      paymentStatus: updated?.status,
      payherePaymentId: (updated?.metadata as { payherePaymentId?: string } | undefined)
        ?.payherePaymentId,
      orderId,
    },
    null,
    2,
  ),
);
await mongoose.disconnect();
