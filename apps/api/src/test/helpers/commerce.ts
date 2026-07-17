import type { Application } from 'express';
import request from 'supertest';
import { PRODUCT_STATUS, VARIANT_STATUS } from '@/constants/product';
import { randomBytes } from 'node:crypto';
import { productService } from '@/services/product.service';
import { productVariantService } from '@/services/product-variant.service';
import { inventoryService } from '@/services/inventory.service';
import { WarehouseModel } from '@/models/inventory.models';
import { MOVEMENT_TYPE } from '@/constants/inventory';
import { OrderModel } from '@/models/order.models';
import { InvoiceModel } from '@/models/order.models';
import { CheckoutSessionModel } from '@/models/checkout.models';
import { waitFor } from '@/test/helpers/db';
import { attemptOrderId, buildCodWebhookPayload, postCodWebhook } from '@/test/helpers/webhook';

const API = '/api/v1';

export type AuthHeaders = { Authorization: string };

export async function seedCatalogAndStock(opts: {
  sku?: string;
  price?: number;
  stock?: number;
  name?: string;
}) {
  const sku =
    opts.sku ?? `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const price = opts.price ?? 2500;
  const stock = opts.stock ?? 10;

  const uniq = randomBytes(6).toString('hex');
  // Use the model directly — WarehouseService extends CmsCrud which auto-slugs
  // from `name` and collides across rapid fixture seeds.
  await WarehouseModel.updateMany({ isDeleted: false }, { $set: { isDefault: false } });
  const warehouse = await WarehouseModel.create({
    name: `Main WH ${uniq}`,
    code: `WH${uniq.toUpperCase()}`,
    isDefault: true,
    status: 'active',
    timezone: 'Asia/Colombo',
    priority: 1,
    address: {
      line1: '1 Warehouse Lane',
      city: 'Colombo',
      postalCode: '00100',
      country: 'LK',
    },
  });

  const product = await productService.create(
    {
      name: opts.name ?? `Test Tee ${sku}`,
      slug: `test-tee-${sku.toLowerCase()}`,
      status: PRODUCT_STATUS.ACTIVE,
      pricing: { price, currency: 'LKR' },
    },
    {},
  );

  const variant = await productVariantService.create(
    product._id.toString(),
    {
      sku,
      title: `${opts.name ?? 'Test Tee'} / M`,
      price,
      currency: 'LKR',
      status: VARIANT_STATUS.ACTIVE,
      weightGrams: 200,
      barcode: `BC${Date.now()}`,
    },
    {},
  );

  await inventoryService.applyMovement(
    {
      warehouseId: warehouse._id.toString(),
      variantId: variant._id.toString(),
      type: MOVEMENT_TYPE.RECEIVE,
      quantity: stock,
      note: 'test seed stock',
    },
    {},
  );

  return {
    warehouseId: warehouse._id.toString(),
    productId: product._id.toString(),
    variantId: variant._id.toString(),
    sku,
    price,
    stock,
  };
}

export async function addCustomerAddress(app: Application, auth: AuthHeaders) {
  const res = await request(app).post(`${API}/customers/me/addresses`).set(auth).send({
    fullName: 'Test Customer',
    phone: '+94771234567',
    line1: '12 Galle Road',
    city: 'Colombo',
    state: 'Western',
    postalCode: '00300',
    country: 'LK',
    isDefaultShipping: true,
    isDefaultBilling: true,
  });
  if (res.status >= 400) {
    throw new Error(`address create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id?: string; _id?: string };
}

export async function addToCart(
  app: Application,
  auth: AuthHeaders,
  variantId: string,
  quantity = 1,
) {
  const res = await request(app).post(`${API}/cart/items`).set(auth).send({ variantId, quantity });
  if (res.status >= 400) {
    throw new Error(`add to cart failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

export async function startCheckout(
  app: Application,
  auth: AuthHeaders,
  shippingAddressId?: string,
  autoReserve = true,
) {
  const res = await request(app).post(`${API}/checkout/start`).set(auth).send({
    shippingAddressId,
    autoReserve,
  });

  // Network-retry semantics: an existing open/reserved/ready session is returned
  // instead of treated as a hard failure (client never got the first response).
  if (res.status === 409 && res.body?.error?.code === 'DUPLICATE_CHECKOUT') {
    const details = res.body.error.details as { checkoutId: string; checkoutToken: string };
    const session = await CheckoutSessionModel.findById(details.checkoutId);
    if (!session) {
      throw new Error(`checkout start failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return {
      id: session._id.toString(),
      checkoutToken: session.checkoutToken,
      status: session.status,
      totals: session.totals as { grandTotal: number; subtotal: number },
      currency: session.currency,
    };
  }

  if (res.status >= 400) {
    throw new Error(`checkout start failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as {
    id: string;
    checkoutToken: string;
    status: string;
    totals: { grandTotal: number; subtotal: number };
    currency: string;
  };
}

export async function createCodPayment(app: Application, auth: AuthHeaders, checkoutToken: string) {
  const res = await request(app)
    .post(`${API}/payments/create`)
    .set(auth)
    .send({ checkoutToken, method: 'cod' });
  if (res.status >= 400) {
    throw new Error(`payment create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as {
    id: string;
    referenceNumber: string;
    amount: number;
    currency: string;
    status: string;
    checkoutToken: string;
  };
}

export async function completeCodPaymentAndWaitForOrder(
  app: Application,
  payment: { referenceNumber: string; amount: number; currency: string; id: string },
  opts: { attemptNumber?: number; collectionId?: string } = {},
) {
  const orderId = attemptOrderId(payment.referenceNumber, opts.attemptNumber ?? 1);
  const payload = buildCodWebhookPayload({
    orderId,
    amount: payment.amount,
    currency: payment.currency,
    collectionId: opts.collectionId,
  });
  const webhookRes = await postCodWebhook(app, payload);
  if (webhookRes.status >= 400) {
    throw new Error(`webhook failed: ${webhookRes.status} ${JSON.stringify(webhookRes.body)}`);
  }

  const order = await waitFor(async () => OrderModel.findOne({ paymentId: payment.id }), {
    label: `order for payment ${payment.id}`,
    timeoutMs: 15_000,
  });

  const invoice = await waitFor(async () => InvoiceModel.findOne({ orderId: order._id }), {
    label: `invoice for order ${order._id}`,
    timeoutMs: 10_000,
  });

  return { order, invoice, webhookRes, attemptOrderId: orderId, payload };
}

/**
 * Full happy path: catalog → cart → checkout → COD payment → order + invoice.
 */
export async function runPurchaseFlow(
  app: Application,
  auth: AuthHeaders,
  catalogOpts: Parameters<typeof seedCatalogAndStock>[0] = {},
) {
  const catalog = await seedCatalogAndStock(catalogOpts);
  const address = await addCustomerAddress(app, auth);
  const addressId = String(address.id ?? address._id);
  await addToCart(app, auth, catalog.variantId, 1);
  const checkout = await startCheckout(app, auth, addressId, true);
  const payment = await createCodPayment(app, auth, checkout.checkoutToken);
  const { order, invoice } = await completeCodPaymentAndWaitForOrder(app, payment);
  return { catalog, addressId, checkout, payment, order, invoice };
}
