import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Application } from 'express';
import request from 'supertest';
import { createApp } from '@/app.js';
import { setupTestDatabase, teardownTestDatabase, resetCollections } from '@/test/helpers/db.js';
import { registerCustomer } from '@/test/helpers/auth.js';
import {
  seedCatalogAndStock,
  addCustomerAddress,
  addToCart,
  startCheckout,
  createCodPayment,
} from '@/test/helpers/commerce.js';
import { InventoryItemModel, StockReservationModel } from '@/models/inventory.models.js';
import { RESERVATION_STATUS } from '@/constants/inventory.js';
import { checkoutService } from '@/services/checkout.service.js';
import { CheckoutSessionModel } from '@/models/checkout.models.js';

const API = '/api/v1';

describe('Checkout inventory timing — reserve only at Place Order', () => {
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

  it('does not change available stock on checkout start or refresh', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 5, price: 1000 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);

    const before = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(before?.available).toBe(5);
    expect(before?.reserved ?? 0).toBe(0);

    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id), false);
    const afterStart = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(afterStart?.available).toBe(5);
    expect(afterStart?.reserved ?? 0).toBe(0);
    expect(afterStart?.onHand).toBe(5);

    await request(app)
      .post(`${API}/checkout/refresh`)
      .set(customer.auth)
      .send({
        checkoutToken: checkout.checkoutToken,
        shippingMethod: 'standard',
        deliveryMethod: 'delivery',
      })
      .expect(200);

    const afterRefresh = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(afterRefresh?.available).toBe(5);
    expect(afterRefresh?.reserved ?? 0).toBe(0);
  });

  it('releases stock when payment-window hold is released after failure', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 4, price: 1500 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id), false);

    // Explicit reserve simulates Place Order hold (payment create path).
    const reserveRes = await request(app)
      .post(`${API}/checkout/reserve`)
      .set(customer.auth)
      .send({ checkoutToken: checkout.checkoutToken });
    expect(reserveRes.status).toBe(200);

    const held = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(held?.reserved).toBe(1);
    expect(held?.available).toBe(3);
    expect(held?.onHand).toBe(4);

    const session = await CheckoutSessionModel.findOne({ checkoutToken: checkout.checkoutToken });
    await checkoutService.releaseForPaymentFailure(
      session!._id.toString(),
      'Payment failed — release hold',
    );

    const released = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(released?.reserved ?? 0).toBe(0);
    expect(released?.available).toBe(4);
    expect(released?.onHand).toBe(4);

    const active = await StockReservationModel.countDocuments({
      variantId: catalog.variantId,
      status: RESERVATION_STATUS.ACTIVE,
    });
    expect(active).toBe(0);
  });

  it('COD place-order commits stock and creates a single order', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 3, price: 2000 });
    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id), false);

    expect(await StockReservationModel.countDocuments({ status: RESERVATION_STATUS.ACTIVE })).toBe(
      0,
    );

    await createCodPayment(app, customer.auth, checkout.checkoutToken);

    const after = await InventoryItemModel.findOne({ variantId: catalog.variantId }).lean();
    expect(after?.onHand).toBe(2);
    expect(after?.reserved ?? 0).toBe(0);
    expect(after?.available).toBe(2);
  });
});
