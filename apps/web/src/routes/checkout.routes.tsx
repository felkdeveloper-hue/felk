import { createRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '@/guards';
import { CheckoutLayout } from '@/layouts/checkout-layout';
import {
  CheckoutCancelPage,
  CheckoutInformationPage,
  CheckoutPaymentPage,
  CheckoutReviewPage,
  CheckoutShippingPage,
  CheckoutSuccessPage,
} from '@/pages/checkout';
import { rootRoute } from './root-route';

export const checkoutLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: () => (
    <ProtectedRoute>
      <CheckoutLayout />
    </ProtectedRoute>
  ),
});

export const checkoutIndexRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: '/',
  component: CheckoutInformationPage,
});

export const checkoutShippingRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'shipping',
  component: CheckoutShippingPage,
});

export const checkoutPaymentRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'payment',
  component: CheckoutPaymentPage,
});

export const checkoutReviewRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'review',
  component: CheckoutReviewPage,
});

export const checkoutSuccessRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'success',
  component: CheckoutSuccessPage,
  validateSearch: (search: Record<string, unknown>) => ({
    checkoutToken: typeof search.checkoutToken === 'string' ? search.checkoutToken : undefined,
  }),
});

export const checkoutCancelRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'cancel',
  component: CheckoutCancelPage,
  validateSearch: (search: Record<string, unknown>) => ({
    checkoutToken: typeof search.checkoutToken === 'string' ? search.checkoutToken : undefined,
  }),
});

/** @deprecated Use checkoutLayoutRoute tree instead. */
export const checkoutRoute = checkoutLayoutRoute;
