import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

function createOrder(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: 'ord_test_1',
    orderNumber: 'ORD-10001',
    status: 'shipped',
    customerId: 'cust_test',
    currency: 'LKR',
    items: [
      {
        id: 'oli_1',
        productId: 'prod_1',
        variantId: 'var_1',
        name: 'Silk Column Dress',
        variantTitle: 'Ivory / M',
        sku: 'SCD-001',
        images: ['https://example.com/dress.jpg'],
        price: 420,
        salePrice: 420,
        discount: 0,
        tax: 0,
        shipping: 0,
        quantity: 1,
        lineSubtotal: 420,
        lineTotal: 420,
      },
    ],
    shippingAddress: {
      fullName: 'Test User',
      phone: '+15550100',
      line1: '123 Market Street',
      city: 'San Francisco',
      postalCode: '94105',
      country: 'US',
    },
    billingAddress: {
      fullName: 'Test User',
      line1: '123 Market Street',
      city: 'San Francisco',
      postalCode: '94105',
      country: 'US',
    },
    shippingMethod: 'standard',
    deliveryMethod: 'delivery',
    totals: {
      subtotal: 420,
      discount: 0,
      shipping: 400,
      tax: 0,
      giftCard: 0,
      grandTotal: 820,
      totalQuantity: 1,
      totalWeightGrams: 500,
    },
    paymentMethod: 'payhere',
    paymentReference: 'PAY-TEST-001',
    paidAt: now,
    placedAt: now,
    confirmedAt: now,
    packedAt: now,
    readyForShipmentAt: now,
    shippedAt: now,
    metadata: {
      tracking: {
        carrier: 'Express Courier',
        trackingNumber: 'TRK-123456',
        trackingUrl: 'https://example.com/track/TRK-123456',
        estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

let ordersState = [
  createOrder(),
  createOrder({
    id: 'ord_test_2',
    orderNumber: 'ORD-10002',
    status: 'delivered',
    metadata: {},
    shippedAt: null,
    deliveredAt: new Date().toISOString(),
  }),
];

let timelineState = [
  {
    _id: 'tl_1',
    orderId: 'ord_test_1',
    event: 'created',
    status: 'pending',
    note: 'Order placed successfully',
    actorType: 'system',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tl_2',
    orderId: 'ord_test_1',
    event: 'status_changed',
    status: 'shipped',
    note: 'Your package is on the way',
    actorType: 'system',
    createdAt: new Date().toISOString(),
  },
];

let returnsState: Array<Record<string, unknown>> = [];

export const orderHandlers = [
  http.get(`${API}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const status = url.searchParams.get('status');
    let items = [...ordersState];
    if (q) {
      items = items.filter((order) =>
        String(order.orderNumber).toLowerCase().includes(q.toLowerCase()),
      );
    }
    if (status) {
      items = items.filter((order) => order.status === status);
    }
    return HttpResponse.json({
      success: true,
      data: items,
      meta: { page: 1, limit: 10, total: items.length, totalPages: 1 },
    });
  }),

  http.get(`${API}/orders/:id`, ({ params }) => {
    const order = ordersState.find((entry) => entry.id === params.id);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: order });
  }),

  http.get(`${API}/orders/number/:orderNumber`, ({ params }) => {
    const order = ordersState.find((entry) => entry.orderNumber === params.orderNumber);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: order });
  }),

  http.get(`${API}/orders/:id/timeline`, ({ params }) => {
    const entries = timelineState.filter((entry) => String(entry.orderId) === params.id);
    return HttpResponse.json({ success: true, data: entries });
  }),

  http.get(`${API}/orders/:id/invoice`, ({ params }) => {
    const order = ordersState.find((entry) => entry.id === params.id);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        _id: 'inv_1',
        invoiceNumber: `INV-${order.orderNumber}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        currency: order.currency,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress,
        items: (order.items as Array<Record<string, unknown>>).map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.salePrice ?? item.price,
          discount: item.discount,
          tax: item.tax,
          lineTotal: item.lineTotal,
        })),
        totals: order.totals,
        paymentReference: order.paymentReference,
        paymentMethod: order.paymentMethod,
        pdf: {
          status: 'not_generated',
          url: null,
          message: 'PDF rendering reserved for a future phase',
        },
        issuedAt: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API}/orders/:id/return`, async ({ params, request }) => {
    const body = (await request.json()) as {
      reason: string;
      description?: string;
      orderItemId?: string;
    };
    const created = {
      _id: `ret_${Date.now()}`,
      orderId: params.id,
      orderItemId: body.orderItemId ?? null,
      reason: body.reason,
      description: body.description ?? null,
      images: [],
      status: 'requested',
      history: [{ status: 'requested', note: body.reason, at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    returnsState.unshift(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get(`${API}/orders/:id/returns`, ({ params }) => {
    const items = returnsState.filter((entry) => String(entry.orderId) === params.id);
    return HttpResponse.json({ success: true, data: items });
  }),

  http.post(`${API}/orders/:id/cancel`, ({ params }) => {
    const order = ordersState.find((entry) => entry.id === params.id);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    order.status = 'cancelled';
    return HttpResponse.json({ success: true, data: order });
  }),
];

export function resetOrderFixtures() {
  ordersState = [
    createOrder(),
    createOrder({
      id: 'ord_test_2',
      orderNumber: 'ORD-10002',
      status: 'delivered',
      metadata: {},
      shippedAt: null,
      deliveredAt: new Date().toISOString(),
    }),
  ];
  timelineState = [
    {
      _id: 'tl_1',
      orderId: 'ord_test_1',
      event: 'created',
      status: 'pending',
      note: 'Order placed successfully',
      actorType: 'system',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tl_2',
      orderId: 'ord_test_1',
      event: 'status_changed',
      status: 'shipped',
      note: 'Your package is on the way',
      actorType: 'system',
      createdAt: new Date().toISOString(),
    },
  ];
  returnsState = [];
}

export function getOrderFixtures() {
  return ordersState;
}
