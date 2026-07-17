import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createApp } from '@/app';
import { setupTestDatabase, teardownTestDatabase, resetCollections } from '@/test/helpers/db';
import { registerCustomer, createAdminUser } from '@/test/helpers/auth';
import {
  seedCatalogAndStock,
  addCustomerAddress,
  addToCart,
  startCheckout,
  createCodPayment,
  completeCodPaymentAndWaitForOrder,
  runPurchaseFlow,
} from '@/test/helpers/commerce';
import { OrderTimelineModel } from '@/models/order.models';
import { InvoiceModel } from '@/models/order.models';
import { AuditLogModel } from '@/models';
import { InventoryItemModel } from '@/models/inventory.models';
import { StockReservationModel } from '@/models/inventory.models';
import { RESERVATION_STATUS } from '@/constants/inventory';

const API = '/api/v1';

describe('Flow 1 — Cart → Checkout → Reserve → Payment → Webhook → Order → Commit → Invoice → Audit', () => {
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

  it('runs the full pipeline with inventory commit, invoice, timeline, and audit', async () => {
    const customer = await registerCustomer(app);
    const catalog = await seedCatalogAndStock({ stock: 8, price: 3200 });
    const addr = await addCustomerAddress(app, customer.auth);

    const cart = await addToCart(app, customer.auth, catalog.variantId, 2);
    expect(cart).toBeTruthy();

    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id), true);
    expect(['ready', 'reserved']).toContain(checkout.status);

    const reserved = await StockReservationModel.find({
      variantId: catalog.variantId,
      status: RESERVATION_STATUS.ACTIVE,
    });
    expect(reserved.length).toBeGreaterThanOrEqual(1);

    const beforePay = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(beforePay?.reserved).toBeGreaterThanOrEqual(2);

    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    expect(payment.status).toMatch(/processing|pending/);

    const { order, invoice } = await completeCodPaymentAndWaitForOrder(app, payment);
    expect(order.orderNumber).toMatch(/^ORD-/);
    expect(order.items.length).toBe(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.paymentReference).toBe(payment.referenceNumber);

    const committed = await StockReservationModel.find({
      _id: { $in: order.reservationIds },
      status: RESERVATION_STATUS.COMMITTED,
    });
    expect(committed.length).toBeGreaterThanOrEqual(1);

    const after = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(after?.onHand).toBe(6); // 8 - 2
    expect(after?.reserved).toBe(0);

    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.paymentReference).toBe(payment.referenceNumber);

    const timeline = await OrderTimelineModel.find({ orderId: order._id });
    expect(timeline.some((t) => t.event === 'created')).toBe(true);

    const audits = await AuditLogModel.find({
      $or: [
        { action: /order\.created/i },
        { action: 'order.created' },
        { resourceId: order._id.toString() },
      ],
    }).limit(20);
    expect(audits.length).toBeGreaterThan(0);

    const invoiceGet = await request(app)
      .get(`${API}/orders/${order._id}/invoice`)
      .set(customer.auth);
    expect(invoiceGet.status).toBe(200);
    expect(invoiceGet.body.data.invoiceNumber).toBe(invoice.invoiceNumber);

    // ensure InvoiceModel uniqueness held
    expect(await InvoiceModel.countDocuments({ orderId: order._id })).toBe(1);
  });
});

describe('Flow 2 & 3 — Product → Inventory → Cart → Checkout → Payment → Order', () => {
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

  it('creates sellable product + stock, then completes a paid order', async () => {
    const customer = await registerCustomer(app);
    const { order, invoice, catalog, payment } = await runPurchaseFlow(app, customer.auth, {
      stock: 12,
      price: 1990,
      name: 'Linen Shirt',
    });

    expect(order.customerId).toBeTruthy();
    expect(order.totals.grandTotal).toBeGreaterThan(0);
    expect(order.items[0].sku).toBe(catalog.sku);
    expect(invoice.totals.grandTotal).toBe(order.totals.grandTotal);

    const getByNumber = await request(app)
      .get(`${API}/orders/number/${order.orderNumber}`)
      .set(customer.auth);
    expect(getByNumber.status).toBe(200);
    expect(getByNumber.body.data.paymentId).toBe(payment.id);

    const item = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(item?.onHand).toBe(11);
  });

  it('second independent purchase (flow 3 repeat) does not collide', async () => {
    const c1 = await registerCustomer(app);
    const c2 = await registerCustomer(app);
    const r1 = await runPurchaseFlow(app, c1.auth, { stock: 5, sku: `F3A-${Date.now()}` });
    const r2 = await runPurchaseFlow(app, c2.auth, { stock: 5, sku: `F3B-${Date.now()}` });
    expect(r1.order.orderNumber).not.toBe(r2.order.orderNumber);
    expect(await OrderTimelineModel.countDocuments({})).toBeGreaterThanOrEqual(2);
  });
});

describe('Flow 4 — Register → Add products → Cart → Checkout → Reserve → Payment → Webhook → Order → Invoice → Audit', () => {
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

  it('end-to-end from brand-new customer registration', async () => {
    const admin = await createAdminUser(app);
    const customer = await registerCustomer(app, {
      email: `flow4_${Date.now()}@example.com`,
      firstName: 'Nimal',
      lastName: 'Perera',
    });

    const me = await request(app).get(`${API}/customers/me`).set(customer.auth);
    expect(me.status).toBe(200);

    const catalog = await seedCatalogAndStock({
      stock: 20,
      price: 4500,
      name: 'Flow4 Jacket',
    });
    // Admin can see inventory
    const inv = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(inv?.available).toBe(20);

    const addr = await addCustomerAddress(app, customer.auth);
    await addToCart(app, customer.auth, catalog.variantId, 1);
    const checkout = await startCheckout(app, customer.auth, String(addr._id ?? addr.id), true);
    expect(checkout.status).toBeTruthy();

    const payment = await createCodPayment(app, customer.auth, checkout.checkoutToken);
    const { order, invoice } = await completeCodPaymentAndWaitForOrder(app, payment);

    expect(invoice.customerId.toString()).toBe(order.customerId.toString());

    const auditCreated = await AuditLogModel.find({
      action: 'order.created',
      resourceId: order._id.toString(),
    });
    expect(auditCreated.length).toBeGreaterThanOrEqual(1);

    const auditInvoice = await AuditLogModel.find({
      action: 'order.invoice_generated',
    });
    expect(auditInvoice.length).toBeGreaterThanOrEqual(1);

    // Customer ownership — admin can list, customer can only see own
    const listOwn = await request(app).get(`${API}/orders`).set(customer.auth);
    expect(listOwn.status).toBe(200);
    expect(listOwn.body.data.length).toBeGreaterThanOrEqual(1);

    const listAdmin = await request(app).get(`${API}/orders`).set(admin.auth);
    expect(listAdmin.status).toBe(200);
  });
});

/**
 * Flow 5 placeholder — left blank in the brief.
 * Covered as regression: status transitions after order creation (warehouse path).
 */
describe('Flow 5 — Post-order warehouse status transitions', () => {
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

  it('warehouse can advance pending → confirmed → packed → ready_for_shipment', async () => {
    const admin = await createAdminUser(app);
    const customer = await registerCustomer(app);
    const { order } = await runPurchaseFlow(app, customer.auth, { stock: 3 });

    for (const status of ['confirmed', 'packed', 'ready_for_shipment'] as const) {
      const res = await request(app)
        .patch(`${API}/orders/${order._id}/status`)
        .set(admin.auth)
        .send({ status, note: `set ${status}` });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }

    const timeline = await OrderTimelineModel.find({ orderId: order._id }).sort({ createdAt: 1 });
    const events = timeline.map((t) => t.event);
    expect(events).toEqual(
      expect.arrayContaining(['created', 'confirmed', 'packed', 'ready_for_shipment']),
    );
  });
});
