/**
 * Live E2E smoke test for payment methods against local API.
 * Run from repo root:
 *   npx pnpm --filter @fe-platform/api exec tsx scripts/e2e-payment-methods.ts
 */
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = 'TestPass1!';

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../..', '.env'),
  ];
  for (const file of candidates) {
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
      /* try next */
    }
  }
  throw new Error('Could not load .env with MONGODB_URI');
}

const env = loadEnv();

async function api(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json, ok: res.ok };
}

function pick<T = unknown>(json: Record<string, unknown>): T {
  return (json?.data ?? json) as T;
}

async function bootstrapCustomer() {
  const email = `paytest_${Date.now()}@example.com`;
  await mongoose.connect(env.MONGODB_URI);
  try {
    const db = mongoose.connection.db!;
    const role = await db
      .collection('roles')
      .findOne({ key: 'customer', isDeleted: { $ne: true } });
    if (!role) throw new Error('customer role missing — run seed:auth');
    const passwordHash = await argon2.hash(PASSWORD);
    await db.collection('users').insertOne({
      email: email.toLowerCase(),
      passwordHash,
      passwordHistory: [],
      firstName: 'Pay',
      lastName: 'Tester',
      phone: '+94771234567',
      roleId: role._id,
      roleKey: 'customer',
      status: 'active',
      emailVerifiedAt: new Date(),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } finally {
    await mongoose.disconnect();
  }

  const login = await api('POST', '/auth/login', {
    body: { email, password: PASSWORD, portal: 'customer' },
  });
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(login.json)}`);
  const token = pick<{ accessToken?: string }>(login.json).accessToken;
  if (!token) throw new Error('no access token');
  return { email, token };
}

async function ensureAddress(token: string) {
  const list = await api('GET', '/customers/me/addresses', { token });
  const existing = pick<unknown>(list.json);
  if (Array.isArray(existing) && existing.length > 0) {
    const first = existing[0] as { id?: string; _id?: string };
    return String(first.id ?? first._id);
  }
  const created = await api('POST', '/customers/me/addresses', {
    token,
    body: {
      fullName: 'Pay Tester',
      phone: '+94771234567',
      line1: '12 Galle Road',
      city: 'Colombo',
      state: 'Western',
      postalCode: '00300',
      country: 'LK',
      isDefaultShipping: true,
      isDefaultBilling: true,
    },
  });
  if (!created.ok) throw new Error(`address failed: ${JSON.stringify(created.json)}`);
  const addr = pick<{ id?: string; _id?: string }>(created.json);
  return String(addr.id ?? addr._id);
}

async function getVariantId() {
  const res = await api('GET', '/storefront/products?limit=5');
  if (!res.ok) throw new Error(`products failed: ${JSON.stringify(res.json)}`);
  const items = pick<unknown>(res.json);
  const list = Array.isArray(items) ? items : ((items as { items?: unknown[] })?.items ?? []);
  const product = list[0] as {
    name?: string;
    slug?: string;
    defaultVariantId?: string;
    variants?: { _id?: string }[];
  };
  if (!product) throw new Error('no products in catalog');
  const variantId = String(product.defaultVariantId ?? product.variants?.[0]?._id ?? '');
  if (!variantId) throw new Error(`no variant on ${product.slug}`);
  return { variantId, name: String(product.name ?? '') };
}

async function clearCart(token: string) {
  const cart = await api('GET', '/cart', { token });
  const data = pick<{ items?: { id?: string; _id?: string }[] }>(cart.json);
  for (const item of data?.items ?? []) {
    const id = item.id ?? item._id;
    if (id) await api('DELETE', `/cart/items/${id}`, { token });
  }
}

async function startReadyCheckout(token: string, variantId: string, addressId: string) {
  await clearCart(token);
  const add = await api('POST', '/cart/items', { token, body: { variantId, quantity: 1 } });
  if (!add.ok) throw new Error(`add to cart failed: ${JSON.stringify(add.json)}`);

  const tryStart = () =>
    api('POST', '/checkout/start', {
      token,
      body: { shippingAddressId: addressId, autoReserve: true },
    });

  let start = await tryStart();
  let checkout = pick<{
    checkoutToken: string;
    status: string;
  }>(start.json);

  if (!start.ok) {
    const details = (
      start.json as { error?: { details?: { checkoutToken?: string; checkoutId?: string } } }
    )?.error?.details;
    const tokenDup = details?.checkoutToken;
    if (tokenDup) {
      await api('DELETE', '/checkout/cancel', { token, body: { checkoutToken: tokenDup } });
      await clearCart(token);
      const reAdd = await api('POST', '/cart/items', { token, body: { variantId, quantity: 1 } });
      if (!reAdd.ok) throw new Error(`re-add to cart failed: ${JSON.stringify(reAdd.json)}`);
      start = await tryStart();
      if (!start.ok) throw new Error(`checkout start failed: ${JSON.stringify(start.json)}`);
      checkout = pick(start.json);
    } else {
      throw new Error(`checkout start failed: ${JSON.stringify(start.json)}`);
    }
  }

  if (checkout.status !== 'ready') {
    const reserve = await api('POST', '/checkout/reserve', {
      token,
      body: { checkoutToken: checkout.checkoutToken },
    });
    checkout = pick(reserve.json) ?? checkout;
  }
  return checkout;
}

async function createPayment(token: string, checkoutToken: string, method: string) {
  return api('POST', '/payments/create', {
    token,
    body: {
      checkoutToken,
      method,
      returnUrl: `http://localhost:5173/checkout/success?checkoutToken=${checkoutToken}`,
      cancelUrl: `http://localhost:5173/checkout/cancel?checkoutToken=${checkoutToken}`,
    },
  });
}

async function waitForOrder(token: string, paymentId: string) {
  for (let i = 0; i < 15; i++) {
    const orders = await api('GET', '/orders?limit=10', { token });
    const list = pick<unknown>(orders.json);
    const items = Array.isArray(list) ? list : ((list as { items?: unknown[] })?.items ?? []);
    const exact = items.find(
      (o) => String((o as { paymentId?: string }).paymentId) === String(paymentId),
    ) as { orderNumber?: string } | undefined;
    if (exact) return exact;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

type Summary = {
  method: string;
  httpStatus: number;
  ok: boolean;
  paymentStatus?: string;
  referenceNumber?: string;
  redirectUrl: string | null;
  redirectFormAction: string | null;
  redirectFormFields: string[];
  error: unknown;
  paymentId?: string;
  orderNumber: string | null;
  orderCreated: boolean;
  pass: boolean;
};

function summarizePayment(method: string, payRes: Awaited<ReturnType<typeof api>>): Summary {
  const p =
    pick<{
      status?: string;
      referenceNumber?: string;
      redirectUrl?: string;
      redirectForm?: { action?: string; fields?: Record<string, string> };
      id?: string;
    }>(payRes.json) ?? {};
  return {
    method,
    httpStatus: payRes.status,
    ok: payRes.ok,
    paymentStatus: p.status,
    referenceNumber: p.referenceNumber,
    redirectUrl: p.redirectUrl ?? null,
    redirectFormAction: p.redirectForm?.action ?? null,
    redirectFormFields: p.redirectForm ? Object.keys(p.redirectForm.fields ?? {}) : [],
    error: payRes.ok ? null : ((payRes.json as { error?: unknown })?.error ?? payRes.json),
    paymentId: p.id,
    orderNumber: null,
    orderCreated: false,
    pass: false,
  };
}

async function testCod(token: string, variantId: string, addressId: string) {
  const checkout = await startReadyCheckout(token, variantId, addressId);
  const payRes = await createPayment(token, checkout.checkoutToken, 'cod');
  const summary = summarizePayment('cod', payRes);
  if (payRes.ok && summary.paymentId) {
    const order = await waitForOrder(token, summary.paymentId);
    summary.orderNumber = order?.orderNumber ?? null;
    summary.orderCreated = Boolean(order);
  }
  summary.pass =
    payRes.ok &&
    !summary.redirectUrl &&
    summary.orderCreated &&
    ['processing', 'pending', 'paid'].includes(String(summary.paymentStatus));
  return summary;
}

async function testPayHere(token: string, variantId: string, addressId: string) {
  const checkout = await startReadyCheckout(token, variantId, addressId);
  const payRes = await createPayment(token, checkout.checkoutToken, 'payhere');
  const summary = summarizePayment('payhere', payRes);
  const action = String(summary.redirectFormAction ?? summary.redirectUrl ?? '');
  summary.pass =
    payRes.ok &&
    action.includes('payhere.lk') &&
    (Boolean(summary.redirectFormAction)
      ? summary.redirectFormFields.includes('hash') &&
        summary.redirectFormFields.includes('merchant_id') &&
        summary.redirectFormFields.includes('notify_url')
      : true);
  return summary;
}

async function testMintpay(token: string, variantId: string, addressId: string) {
  const checkout = await startReadyCheckout(token, variantId, addressId);
  const payRes = await createPayment(token, checkout.checkoutToken, 'mintpay');
  const summary = summarizePayment('mintpay', payRes);
  const action = String(summary.redirectFormAction ?? summary.redirectUrl ?? '');
  summary.pass =
    payRes.ok &&
    action.includes('mintpay.lk') &&
    Boolean(summary.redirectFormAction) &&
    summary.redirectFormFields.includes('purchase_id');
  return summary;
}

async function testKoko(token: string, variantId: string, addressId: string) {
  const checkout = await startReadyCheckout(token, variantId, addressId);
  const payRes = await createPayment(token, checkout.checkoutToken, 'koko');
  const summary = summarizePayment('koko', payRes);
  const action = String(summary.redirectFormAction ?? summary.redirectUrl ?? '');
  summary.pass =
    payRes.ok &&
    action.includes('paykoko.com') &&
    Boolean(summary.redirectFormAction) &&
    summary.redirectFormFields.includes('signature');
  return summary;
}

async function main() {
  console.log('API:', API);
  console.log('Mintpay secret set:', Boolean(env.MINTPAY_MERCHANT_SECRET));
  console.log('Mintpay merchant:', env.MINTPAY_MERCHANT_ID);

  const health = await api('GET', '/health');
  if (!health.ok) throw new Error(`API not healthy: ${JSON.stringify(health.json)}`);

  const { email, token } = await bootstrapCustomer();
  console.log('Customer:', email);

  const { variantId, name } = await getVariantId();
  console.log('Product:', name, 'variant:', variantId);

  const addressId = await ensureAddress(token);
  console.log('Address:', addressId);

  const results: Summary[] = [];

  console.log('\n--- COD ---');
  results.push(await testCod(token, variantId, addressId));
  console.log(JSON.stringify(results.at(-1), null, 2));

  console.log('\n--- PayHere ---');
  results.push(await testPayHere(token, variantId, addressId));
  console.log(JSON.stringify(results.at(-1), null, 2));

  console.log('\n--- Mintpay ---');
  results.push(await testMintpay(token, variantId, addressId));
  console.log(JSON.stringify(results.at(-1), null, 2));

  console.log('\n--- Koko ---');
  results.push(await testKoko(token, variantId, addressId));
  console.log(JSON.stringify(results.at(-1), null, 2));

  console.log('\n========== SUMMARY ==========');
  for (const r of results) {
    const err = r.error
      ? ` ${String((r.error as { code?: string; message?: string }).code ?? (r.error as { message?: string }).message ?? '')}`
      : '';
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'}  ${r.method.padEnd(10)}  http=${r.httpStatus}  status=${r.paymentStatus ?? '-'}${err}`,
    );
  }
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
