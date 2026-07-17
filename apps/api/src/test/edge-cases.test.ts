import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '@/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetCollections,
  waitFor,
} from '@/test/helpers/db';
import { registerCustomer, createAdminUser } from '@/test/helpers/auth';
import {
  seedCatalogAndStock,
  addCustomerAddress,
  addToCart,
  startCheckout,
  createCodPayment,
  completeCodPaymentAndWaitForOrder,
} from '@/test/helpers/commerce';
import { attemptOrderId, buildCodWebhookPayload, postCodWebhook } from '@/test/helpers/webhook';
import { OrderModel } from '@/models/order.models';
import { CheckoutSessionModel } from '@/models/checkout.models';
import { StockReservationModel } from '@/models/inventory.models';
import { PaymentModel } from '@/models/payment.models';
import { InventoryItemModel } from '@/models/inventory.models';
import { ProductVariantModel } from '@/models/product.models';
import { reservationService } from '@/services/reservation.service';
import { handlePaymentSucceededEvent } from '@/services/order-payment-consumer.service';
import { PAYMENT_EVENT_TYPE } from '@/constants/payment';
import { RESERVATION_STATUS } from '@/constants/inventory';

const API = '/api/v1';

describe('Edge cases — commerce pipeline', () => {
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

  it('two customers buying the last item — only one reservation succeeds', async () => {
    const catalog = await seedCatalogAndStock({ stock: 1, sku: `LAST-${Date.now()}` });
    const a = await registerCustomer(app);
    const b = await registerCustomer(app);
    const addrA = await addCustomerAddress(app, a.auth);
    const addrB = await addCustomerAddress(app, b.auth);
    await addToCart(app, a.auth, catalog.variantId, 1);
    await addToCart(app, b.auth, catalog.variantId, 1);

    const settled = await Promise.allSettled([
      startCheckout(app, a.auth, String(addrA._id ?? addrA.id), true),
      startCheckout(app, b.auth, String(addrB._id ?? addrB.id), true),
    ]);

    const ok = settled.filter((s) => s.status === 'fulfilled');
    const fail = settled.filter((s) => s.status === 'rejected');
    expect(ok.length).toBe(1);
    expect(fail.length).toBe(1);

    const item = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(item?.available).toBe(0);
    expect(item?.reserved).toBe(1);
  });

  it('payment webhook arriving twice is idempotent (one payment, one order)', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 5 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);

    const orderId = attemptOrderId(payment.referenceNumber, 1);
    const payload = buildCodWebhookPayload({
      orderId,
      amount: payment.amount,
      currency: payment.currency,
      collectionId: 'same-event-id-twice',
    });

    const first = await postCodWebhook(app, payload);
    const second = await postCodWebhook(app, payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data?.duplicate === true || second.body.data?.ok === true).toBeTruthy();

    await waitFor(async () => OrderModel.findOne({ paymentId: payment.id }), {
      label: 'order after duplicate webhook',
    });

    const orderCount = await OrderModel.countDocuments({ paymentId: payment.id });
    expect(orderCount).toBe(1);
    const paid = await PaymentModel.findById(payment.id);
    expect(paid?.status).toBe('paid');
  });

  it('webhook before browser redirect still completes payment and creates order', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 3 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);

    // Webhook lands before any client-side status poll / redirect.
    const { order } = await completeCodPaymentAndWaitForOrder(app, payment);
    expect(order.status).toBe('pending');

    const status = await request(app).get(`${API}/payments/status/${checkout.checkoutToken}`);
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe('paid');
  });

  it('browser refresh during payment is idempotent on create', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 3 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));

    const first = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    const second = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    expect(first.id).toBe(second.id);
    expect(first.referenceNumber).toBe(second.referenceNumber);

    const count = await PaymentModel.countDocuments({ checkoutToken: checkout.checkoutToken });
    expect(count).toBe(1);
  });

  it('inventory reservation expiry releases stock', async () => {
    const catalog = await seedCatalogAndStock({ stock: 2 });
    const customer = await registerCustomer(app);
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));

    const reservation = await StockReservationModel.findOne({
      status: RESERVATION_STATUS.ACTIVE,
      variantId: catalog.variantId,
    });
    expect(reservation).toBeTruthy();

    reservation!.expiresAt = new Date(Date.now() - 1000);
    await reservation!.save();

    await CheckoutSessionModel.updateOne(
      { _id: checkout.id },
      { $set: { reservationExpiresAt: new Date(Date.now() - 1000) } },
    );

    const expired = await reservationService.expireDue({});
    expect(expired.processed).toBeGreaterThanOrEqual(1);

    const item = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(item?.reserved).toBe(0);
    expect(item?.available).toBe(2);
  });

  it('checkout expiry rejects further payment creation', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 2 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));

    await CheckoutSessionModel.updateOne(
      { _id: checkout.id },
      {
        $set: {
          expiresAt: new Date(Date.now() - 1000),
          reservationExpiresAt: new Date(Date.now() - 1000),
          status: 'expired',
        },
      },
    );

    const res = await request(app)
      .post(`${API}/payments/create`)
      .set(customer.auth)
      .send({ checkoutToken: checkout.checkoutToken, method: 'cod' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('duplicate order creation from PaymentSucceeded is idempotent', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 4 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    await completeCodPaymentAndWaitForOrder(app, payment);

    await handlePaymentSucceededEvent({
      paymentId: payment.id,
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      gatewayTxnId: 'dup-test',
    });
    await handlePaymentSucceededEvent({
      paymentId: payment.id,
      checkoutToken: payment.checkoutToken,
      amount: payment.amount,
      currency: payment.currency,
      gatewayTxnId: 'dup-test-2',
    });

    expect(await OrderModel.countDocuments({ paymentId: payment.id })).toBe(1);
    void PAYMENT_EVENT_TYPE;
  });

  it('payment retry after failure creates a new attempt that can succeed', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 3 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);

    const failPayload = buildCodWebhookPayload({
      orderId: attemptOrderId(payment.referenceNumber, 1),
      amount: payment.amount,
      currency: payment.currency,
      status: 'refused',
      collectionId: 'fail-once',
    });
    const failRes = await postCodWebhook(app, failPayload);
    expect(failRes.status).toBe(200);

    await waitFor(async () => {
      const p = await PaymentModel.findById(payment.id);
      return p?.status === 'failed' ? p : null;
    });

    const retry = await request(app)
      .post(`${API}/payments/retry`)
      .set(customer.auth)
      .send({ paymentId: payment.id });
    expect(retry.status).toBe(200);
    expect(retry.body.data.attemptCount).toBeGreaterThanOrEqual(2);

    const { order } = await completeCodPaymentAndWaitForOrder(
      app,
      {
        ...payment,
        amount: retry.body.data.amount,
        currency: retry.body.data.currency,
        referenceNumber: retry.body.data.referenceNumber,
        id: retry.body.data.id,
      },
      { attemptNumber: retry.body.data.attemptCount },
    );

    expect(order).toBeTruthy();
  });

  it('cancel after payment restores inventory via RETURN movement', async () => {
    const customer = await registerCustomer(app);
    const admin = await createAdminUser(app);
    const catalog = await seedCatalogAndStock({ stock: 5 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    const { order } = await completeCodPaymentAndWaitForOrder(app, payment);

    // Move to confirmed then cancel path from pending/confirmed
    const cancel = await request(app)
      .post(`${API}/orders/${order._id}/cancel`)
      .set(customer.auth)
      .send({ reason: 'Changed my mind' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');

    const item = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    // onHand back to 5 after RETURN; available should recover
    expect(item?.onHand).toBe(5);
    expect(item?.available).toBe(5);
    void admin;
  });

  it('out-of-stock during checkout rejects reservation', async () => {
    const catalog = await seedCatalogAndStock({ stock: 1 });
    const customer = await registerCustomer(app);
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);

    // Drain stock after cart add, before checkout.
    await InventoryItemModel.updateOne(
      { variantId: catalog.variantId },
      { $set: { onHand: 0, available: 0, reserved: 0 } },
    );

    await expect(
      startCheckout(app, customer.auth, String(addr._id ?? addr.id), true),
    ).rejects.toThrow(/checkout start failed/);
  });

  it('price changes while item is in cart are flagged on validate', async () => {
    const catalog = await seedCatalogAndStock({ stock: 5, price: 1000 });
    const customer = await registerCustomer(app);
    await addToCart(app, customer.auth, catalog.variantId, 1);

    await ProductVariantModel.updateOne(
      { _id: catalog.variantId },
      { $set: { price: 1500, salePrice: null } },
    );

    const validate = await request(app).post(`${API}/cart/validate`).set(customer.auth);
    expect(validate.status).toBe(200);
    const issues = (validate.body.data?.validation?.issues ??
      validate.body.data?.issues ??
      []) as Array<{ code?: string }>;
    expect(issues.some((i) => i.code === 'PRICE_CHANGED')).toBe(true);
  });

  it('network interruption during checkout — retry start is safe', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 4 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);

    const first = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    // Client never got the response; retries start.
    const second = await startCheckout(app, customer.auth, String(addr._id ?? addr.id));
    expect(first.id).toBe(second.id);
    expect(first.checkoutToken).toBe(second.checkoutToken);

    const openCount = await CheckoutSessionModel.countDocuments({
      checkoutToken: first.checkoutToken,
    });
    expect(openCount).toBe(1);
  });
});
