import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

const RESERVATION_TTL_MS = 30 * 60 * 1000;

function createCheckoutSession(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: 'chk_test_1',
    checkoutToken: 'checkout-token-test',
    status: 'ready',
    currency: 'LKR',
    lines: [
      {
        cartItemId: 'item_var_1',
        productId: 'prod_1',
        variantId: 'var_1',
        sku: 'SCD-001',
        title: 'Silk Column Dress',
        quantity: 1,
        unitPrice: 420,
        lineSubtotal: 420,
        colorName: 'Ivory',
        sizeName: 'M',
        thumbnailUrl: 'https://example.com/dress.jpg',
      },
    ],
    shippingAddress: {
      addressId: 'addr_1',
      fullName: 'Test User',
      phone: '+15550100',
      line1: '123 Market Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    billingAddress: {
      addressId: 'addr_1',
      fullName: 'Test User',
      line1: '123 Market Street',
      city: 'San Francisco',
      postalCode: '94105',
      country: 'US',
    },
    shippingMethod: 'standard',
    deliveryMethod: 'delivery',
    shippingEstimate: {
      amount: 400,
      method: 'standard',
      estimatedDaysMin: 3,
      estimatedDaysMax: 7,
      label: 'Standard shipping',
    },
    taxEstimate: { amount: 0, status: 'estimated' },
    totals: {
      subtotal: 420,
      discount: 0,
      shipping: 400,
      tax: 0,
      giftCard: 0,
      grandTotal: 820,
      totalQuantity: 1,
      currency: 'LKR',
    },
    reservationExpiresAt: new Date(now + RESERVATION_TTL_MS).toISOString(),
    expiresAt: new Date(now + RESERVATION_TTL_MS * 2).toISOString(),
    validationIssues: [],
    summary: {
      readyForPayment: true,
      grandTotal: 820,
      currency: 'LKR',
    },
    ...overrides,
  };
}

let checkoutState = createCheckoutSession();
let paymentStatus = 'pending';
let forceExpired = false;
let forceReservationExpired = false;
let validationInvalid = false;

export const checkoutHandlers = [
  http.post(`${API}/checkout/start`, async () => {
    if (checkoutState.status !== 'cancelled' && checkoutState.status !== 'expired') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            message: 'Active checkout already exists',
            code: 'DUPLICATE_CHECKOUT',
            details: {
              checkoutId: checkoutState.id,
              checkoutToken: checkoutState.checkoutToken,
            },
          },
        },
        { status: 409 },
      );
    }

    checkoutState = createCheckoutSession();
    forceExpired = false;
    forceReservationExpired = false;
    validationInvalid = false;
    paymentStatus = 'pending';
    return HttpResponse.json({ success: true, data: checkoutState });
  }),

  http.get(`${API}/checkout/:idOrToken`, ({ params }) => {
    if (params.idOrToken === 'invalid-token') {
      return HttpResponse.json(
        { success: false, error: { message: 'Checkout not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    if (forceExpired) {
      return HttpResponse.json({
        success: true,
        data: {
          ...checkoutState,
          status: 'expired',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      });
    }

    if (forceReservationExpired) {
      return HttpResponse.json({
        success: true,
        data: {
          ...checkoutState,
          reservationExpiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      });
    }

    return HttpResponse.json({ success: true, data: checkoutState });
  }),

  http.post(`${API}/checkout/validate`, () => {
    if (validationInvalid) {
      return HttpResponse.json({
        success: true,
        data: {
          ...checkoutState,
          valid: false,
          issues: [
            { message: 'An item is no longer available', severity: 'error', code: 'INVENTORY' },
          ],
          validationIssues: [
            { message: 'An item is no longer available', severity: 'error', code: 'INVENTORY' },
          ],
        },
      });
    }

    return HttpResponse.json({
      success: true,
      data: { ...checkoutState, valid: true, issues: [] },
    });
  }),

  http.post(`${API}/checkout/refresh`, async ({ request }) => {
    const body = (await request.json()) as {
      shippingMethod?: string;
      extendReservation?: boolean;
    };

    const shippingAmount =
      body.shippingMethod === 'express'
        ? 800
        : body.shippingMethod === 'free' || body.shippingMethod === 'pickup'
          ? 0
          : 400;

    checkoutState = {
      ...checkoutState,
      shippingMethod: body.shippingMethod ?? checkoutState.shippingMethod,
      shippingEstimate: {
        ...checkoutState.shippingEstimate,
        amount: shippingAmount,
        method: body.shippingMethod ?? checkoutState.shippingMethod,
      },
      totals: {
        ...checkoutState.totals,
        shipping: shippingAmount,
        grandTotal: checkoutState.totals.subtotal + shippingAmount + checkoutState.totals.tax,
      },
      reservationExpiresAt: body.extendReservation
        ? new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
        : checkoutState.reservationExpiresAt,
    };

    return HttpResponse.json({ success: true, data: checkoutState });
  }),

  http.post(`${API}/checkout/reserve`, () =>
    HttpResponse.json({
      success: true,
      data: { ...checkoutState, status: 'reserved' },
    }),
  ),

  http.post(`${API}/checkout/release`, () =>
    HttpResponse.json({
      success: true,
      data: { ...checkoutState, status: 'open' },
    }),
  ),

  http.delete(`${API}/checkout/cancel`, () => {
    checkoutState = { ...checkoutState, status: 'cancelled' };
    return HttpResponse.json({ success: true, data: { message: 'Checkout cancelled' } });
  }),
];

export const paymentHandlers = [
  http.post(`${API}/payments/create`, async ({ request }) => {
    const body = (await request.json()) as { method?: string; checkoutToken?: string };
    paymentStatus = body.method === 'cod' ? 'processing' : 'processing';

    if (body.method === 'cod') {
      return HttpResponse.json({
        success: true,
        data: {
          id: 'pay_test_1',
          referenceNumber: 'PAY-TEST-001',
          checkoutId: checkoutState.id,
          checkoutToken: body.checkoutToken ?? checkoutState.checkoutToken,
          method: 'cod',
          status: 'processing',
          amount: checkoutState.totals.grandTotal,
          currency: checkoutState.currency,
        },
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: 'pay_test_1',
        referenceNumber: 'PAY-TEST-001',
        checkoutId: checkoutState.id,
        checkoutToken: body.checkoutToken ?? checkoutState.checkoutToken,
        method: body.method ?? 'payhere',
        status: 'processing',
        amount: checkoutState.totals.grandTotal,
        currency: checkoutState.currency,
        redirectUrl: 'https://sandbox.payhere.lk/pay/checkout?order=test',
      },
    });
  }),

  http.post(`${API}/payments/retry`, async ({ request }) => {
    const body = (await request.json()) as { checkoutToken?: string; method?: string };
    return HttpResponse.json({
      success: true,
      data: {
        id: 'pay_test_1',
        checkoutToken: body.checkoutToken ?? checkoutState.checkoutToken,
        method: body.method ?? 'payhere',
        status: 'processing',
        amount: checkoutState.totals.grandTotal,
        currency: checkoutState.currency,
        redirectUrl: 'https://sandbox.payhere.lk/pay/checkout?order=retry',
      },
    });
  }),

  http.get(`${API}/payments/status/:checkoutToken`, ({ params }) => {
    if (params.checkoutToken === 'paid-token') {
      return HttpResponse.json({
        success: true,
        data: {
          checkoutToken: 'paid-token',
          status: 'paid',
          method: 'payhere',
          amount: 820,
          currency: 'LKR',
          redirectUrl: null,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        checkoutToken: params.checkoutToken,
        status: paymentStatus,
        method: 'payhere',
        amount: checkoutState.totals.grandTotal,
        currency: checkoutState.currency,
        redirectUrl:
          paymentStatus === 'processing'
            ? 'https://sandbox.payhere.lk/pay/checkout?order=test'
            : null,
        updatedAt: new Date().toISOString(),
      },
    });
  }),
];

export function resetCheckoutFixtures() {
  checkoutState = createCheckoutSession();
  paymentStatus = 'pending';
  forceExpired = false;
  forceReservationExpired = false;
  validationInvalid = false;
}

export function simulateCheckoutSessionExpired() {
  forceExpired = true;
}

export function simulateReservationExpired() {
  forceReservationExpired = true;
}

export function simulateCheckoutValidationFailure() {
  validationInvalid = true;
}

export function simulatePaymentPaid() {
  paymentStatus = 'paid';
}

export function getCheckoutFixtureState() {
  return checkoutState;
}
