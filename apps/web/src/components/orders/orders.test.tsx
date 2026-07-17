import { describe, expect, it, beforeEach } from 'vitest';
import { ordersApi } from '@/services/sdk';
import { normalizeOrder, normalizeTimelineEntry } from '@/utils/orders';

describe('normalizeOrder', () => {
  it('maps backend order summary fields', () => {
    const order = normalizeOrder({
      id: 'ord_1',
      orderNumber: 'ORD-10001',
      status: 'shipped',
      currency: 'LKR',
      items: [
        {
          id: 'oli_1',
          productId: 'p1',
          variantId: 'v1',
          name: 'Dress',
          sku: 'SKU',
          quantity: 1,
          lineTotal: 420,
        },
      ],
      totals: {
        subtotal: 420,
        discount: 0,
        shipping: 400,
        tax: 0,
        grandTotal: 820,
        totalQuantity: 1,
      },
      paidAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        tracking: {
          carrier: 'Courier',
          trackingNumber: 'TRK-1',
          trackingUrl: 'https://example.com/track',
        },
      },
    });

    expect(order.orderNumber).toBe('ORD-10001');
    expect(order.paymentStatus).toBe('paid');
    expect(order.tracking?.trackingNumber).toBe('TRK-1');
  });
});

describe('normalizeTimelineEntry', () => {
  it('maps timeline events', () => {
    const entry = normalizeTimelineEntry({
      _id: 'tl_1',
      event: 'status_changed',
      status: 'shipped',
      note: 'Shipped',
      actorType: 'system',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(entry.event).toBe('status_changed');
    expect(entry.note).toBe('Shipped');
  });
});

describe('ordersApi integration', () => {
  beforeEach(() => {
    // fixtures reset in setup.ts afterEach
  });

  it('lists orders with search and status filters', async () => {
    const all = await ordersApi.list({ sort: 'newest' });
    expect(all.data.length).toBeGreaterThan(0);

    const searched = await ordersApi.list({ q: 'ORD-10001' });
    expect(searched.data.every((order) => order.orderNumber.includes('ORD-10001'))).toBe(true);

    const shipped = await ordersApi.list({ status: 'shipped' });
    expect(shipped.data.every((order) => order.status === 'shipped')).toBe(true);
  });

  it('loads order detail, timeline, and invoice', async () => {
    const order = await ordersApi.getById('ord_test_1');
    expect(order.items).toHaveLength(1);

    const timeline = await ordersApi.getTimeline('ord_test_1');
    expect(timeline.length).toBeGreaterThan(0);

    const invoice = await ordersApi.getInvoice('ord_test_1');
    expect(invoice.invoiceNumber).toContain('INV-');
    expect(invoice.pdf.url).toBeNull();
  });

  it('creates return requests for delivered orders', async () => {
    const created = await ordersApi.requestReturn('ord_test_2', {
      reason: 'Wrong item received',
      description: 'Received the wrong size',
    });
    expect(created.status).toBe('requested');

    const returns = await ordersApi.listReturns('ord_test_2');
    expect(returns.length).toBeGreaterThan(0);
  });
});

describe('OrderTimeline logic', () => {
  it('identifies shipped orders with tracking metadata', async () => {
    const order = await ordersApi.getById('ord_test_1');
    expect(order.tracking?.carrier).toBe('Express Courier');
    expect(order.status).toBe('shipped');
  });

  it('shows placeholder when tracking is unavailable', async () => {
    const order = await ordersApi.getById('ord_test_2');
    expect(order.tracking).toBeNull();
  });
});
