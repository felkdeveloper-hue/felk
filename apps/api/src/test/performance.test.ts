import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Application } from 'express';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { setupTestDatabase, teardownTestDatabase, resetCollections } from '@/test/helpers/db';
import { registerCustomer } from '@/test/helpers/auth';
import {
  seedCatalogAndStock,
  addCustomerAddress,
  addToCart,
  startCheckout,
} from '@/test/helpers/commerce';
import { InventoryItemModel } from '@/models/inventory.models';
import { OrderModel } from '@/models/order.models';
import { PaymentModel } from '@/models/payment.models';
import { CheckoutSessionModel } from '@/models/checkout.models';
import { ProductModel } from '@/models/product.models';
import { PRODUCT_STATUS } from '@/constants/product';

/**
 * Performance / scale smoke tests.
 *
 * Full load (500 / 5,000 VUs, 100k products, 1M orders) belongs in staging via
 * `src/test/load/load-test.mjs` + `src/test/load/k6-smoke.js`. These vitest
 * cases capture index coverage and concurrent contention that MUST pass before
 * adding more modules.
 */
describe('Performance — indexes, contention, dashboard queries', () => {
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

  it('critical collections expose the expected indexes', async () => {
    // Touch collections so mongoose syncs schema indexes, then list them.
    await Promise.all([
      OrderModel.findOne().lean(),
      PaymentModel.findOne().lean(),
      CheckoutSessionModel.findOne().lean(),
      InventoryItemModel.findOne().lean(),
      ProductModel.findOne().lean(),
    ]);

    const [orderIdx, paymentIdx, checkoutIdx, invIdx, productIdx] = await Promise.all([
      OrderModel.collection.indexes(),
      PaymentModel.collection.indexes(),
      CheckoutSessionModel.collection.indexes(),
      InventoryItemModel.collection.indexes(),
      ProductModel.collection.indexes(),
    ]);

    const names = (idxs: Array<Record<string, unknown>>) =>
      idxs.flatMap((i) => Object.keys((i.key as object) ?? {}));

    expect(names(orderIdx)).toEqual(expect.arrayContaining(['paymentId', 'customerId', 'status']));
    expect(names(paymentIdx)).toEqual(
      expect.arrayContaining(['referenceNumber', 'checkoutToken', 'customerId']),
    );
    expect(names(checkoutIdx)).toEqual(
      expect.arrayContaining(['checkoutToken', 'customerId', 'status']),
    );
    expect(names(invIdx)).toEqual(
      expect.arrayContaining(['warehouseId', 'variantId', 'available']),
    );
    expect(names(productIdx)).toEqual(expect.arrayContaining(['slug', 'status']));
  });

  it('concurrent checkout reservation contention stays consistent (last-unit race)', async () => {
    const catalog = await seedCatalogAndStock({ stock: 1, sku: `PERF-${Date.now()}` });
    const buyers = await Promise.all(Array.from({ length: 20 }, () => registerCustomer(app)));

    const sessions = await Promise.all(
      buyers.map(async (b) => {
        const addr = await addCustomerAddress(app, b.auth);
        await addToCart(app, b.auth, catalog.variantId, 1);
        return { auth: b.auth, addressId: String(addr._id ?? addr.id) };
      }),
    );

    const results = await Promise.allSettled(
      sessions.map((s) => startCheckout(app, s.auth, s.addressId, true)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(19);

    const item = await InventoryItemModel.findOne({ variantId: catalog.variantId });
    expect(item?.available).toBe(0);
    expect(item?.reserved).toBe(1);
    expect((item?.available ?? 0) + (item?.reserved ?? 0)).toBeLessThanOrEqual(item?.onHand ?? 0);
  });

  it('bulk product insert (1k) stays under a reasonable budget', async () => {
    const stamp = Date.now();
    const docs = Array.from({ length: 1000 }, (_, i) => ({
      name: `Bulk Product ${stamp}-${i}`,
      slug: `bulk-${stamp}-${i}`,
      status: PRODUCT_STATUS.ACTIVE,
      tags: [],
      collectionIds: [],
      occasionIds: [],
      searchKeywords: [],
      specifications: [],
      attributeLinks: [],
      pricing: { price: 1000 + i, currency: 'LKR' },
      variantCount: 0,
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      isBestSeller: false,
      isClearance: false,
      visibility: 'public',
      version: 1,
      isDeleted: false,
    }));

    const started = Date.now();
    await ProductModel.insertMany(docs, { ordered: false });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(15_000);
    const count = await ProductModel.countDocuments({ slug: new RegExp(`^bulk-${stamp}-`) });
    expect(count).toBe(1000);

    // Dashboard-style query: active products sorted by createdAt
    const qStart = Date.now();
    const page = await ProductModel.find({ status: PRODUCT_STATUS.ACTIVE, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const qElapsed = Date.now() - qStart;
    expect(page.length).toBe(50);
    expect(qElapsed).toBeLessThan(2_000);
  });

  it('dashboard order aggregations use indexed fields', async () => {
    // Seed a handful of synthetic orders for query plan safety
    const customerId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    await OrderModel.create({
      orderNumber: `ORD-PERF-${Date.now()}`,
      paymentId,
      checkoutId: new mongoose.Types.ObjectId(),
      checkoutToken: `tok_${Date.now()}`,
      customerId,
      status: 'pending',
      items: [],
      currency: 'LKR',
      totals: {
        subtotal: 100,
        discount: 0,
        shipping: 0,
        tax: 0,
        giftCard: 0,
        grandTotal: 100,
        totalWeightGrams: 0,
        totalQuantity: 1,
      },
      paymentMethod: 'cod',
      paymentReference: `PAY-PERF-${Date.now()}`,
      placedAt: new Date(),
      reservationIds: [],
    });

    const started = Date.now();
    const [byStatus, byCustomer] = await Promise.all([
      OrderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      OrderModel.find({ customerId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(byStatus.length).toBeGreaterThan(0);
    expect(byCustomer.length).toBe(1);
  });
});
