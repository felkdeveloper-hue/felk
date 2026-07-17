import { beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { checkoutApi, paymentsApi } from '@/services/sdk';
import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import {
  getCheckoutFixtureState,
  resetCheckoutFixtures,
  simulateCheckoutSessionExpired,
  simulateCheckoutValidationFailure,
  simulatePaymentPaid,
  simulateReservationExpired,
} from '@/test/msw/checkout-fixtures';
import { resetCartFixtures } from '@/test/msw/cart-fixtures';
import { AppError } from '@/lib/errors';

describe('checkoutApi integration', () => {
  beforeEach(() => {
    resetCheckoutFixtures();
    resetCartFixtures();
    useCheckoutStore.getState().resetCheckoutUi();
    useCartStore.setState({ cart: null, guestCartToken: null, isSyncing: false });
  });

  it('starts checkout and resumes duplicate sessions', async () => {
    await expect(checkoutApi.start({ autoReserve: true })).rejects.toSatisfy((error: unknown) => {
      return AppError.isAppError(error) && error.code === 'DUPLICATE_CHECKOUT';
    });

    const resumed = await checkoutApi.getById('checkout-token-test');
    expect(resumed.checkoutToken).toBe('checkout-token-test');
    expect(resumed.lines.length).toBeGreaterThan(0);
  });

  it('refreshes shipping method totals', async () => {
    const session = await checkoutApi.getById('checkout-token-test');
    const refreshed = await checkoutApi.refresh(session.checkoutToken, {
      shippingMethod: 'express',
      extendReservation: true,
    });

    expect(refreshed.shippingMethod).toBe('express');
    expect(refreshed.totals.shipping).toBe(800);
    expect(refreshed.totals.grandTotal).toBe(refreshed.totals.subtotal + 800);
  });

  it('returns validation issues when inventory changes', async () => {
    simulateCheckoutValidationFailure();
    const result = await checkoutApi.validate('checkout-token-test');
    expect(result.valid).toBe(false);
    expect(result.issues?.[0]?.message).toMatch(/no longer available/i);
  });

  it('surfaces expired checkout sessions', async () => {
    simulateCheckoutSessionExpired();
    const session = await checkoutApi.getById('checkout-token-test');
    expect(session.status).toBe('expired');
  });

  it('surfaces expired reservations', async () => {
    simulateReservationExpired();
    const session = await checkoutApi.getById('checkout-token-test');
    expect(new Date(session.reservationExpiresAt!).getTime()).toBeLessThan(Date.now());
  });
});

describe('paymentsApi integration', () => {
  beforeEach(() => {
    resetCheckoutFixtures();
    useCheckoutStore.getState().resetCheckoutUi();
  });

  it('creates gateway payments with redirect URLs', async () => {
    const payment = await paymentsApi.create({
      checkoutToken: getCheckoutFixtureState().checkoutToken,
      method: 'payhere',
      returnUrl: 'http://localhost:5173/checkout/success?checkoutToken=checkout-token-test',
      cancelUrl: 'http://localhost:5173/checkout/cancel?checkoutToken=checkout-token-test',
    });

    expect(payment.redirectUrl).toContain('payhere');
    expect(payment.method).toBe('payhere');
  });

  it('creates COD payments without redirect', async () => {
    const payment = await paymentsApi.create({
      checkoutToken: getCheckoutFixtureState().checkoutToken,
      method: 'cod',
    });

    expect(payment.redirectUrl).toBeUndefined();
    expect(payment.status).toBe('processing');
  });

  it('polls payment status until paid', async () => {
    simulatePaymentPaid();
    const status = await paymentsApi.getStatusByCheckoutToken('checkout-token-test');

    await waitFor(() => {
      expect(status.status).toBe('paid');
    });
  });

  it('retries failed gateway payments', async () => {
    const retried = await paymentsApi.retry({
      checkoutToken: getCheckoutFixtureState().checkoutToken,
      method: 'payhere',
    });

    expect(retried.redirectUrl).toContain('retry');
  });
});

describe('payment redirect helper', () => {
  it('returns redirect URL for gateway payments', async () => {
    const payment = await paymentsApi.create({
      checkoutToken: 'checkout-token-test',
      method: 'koko',
      returnUrl: 'http://localhost:5173/checkout/success',
      cancelUrl: 'http://localhost:5173/checkout/cancel',
    });

    expect(payment.redirectUrl).toContain('payhere');
  });
});
