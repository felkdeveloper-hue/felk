import { createRoute, redirect } from '@tanstack/react-router';
import { CheckoutLayout } from '@/layouts/checkout-layout';
import {
  CheckoutCancelPage,
  CheckoutInformationPage,
  CheckoutPaymentPage,
  CheckoutReviewPage,
  CheckoutSuccessPage,
} from '@/pages/checkout';
import { ROUTES } from '@/constants';
import { rootRoute } from './root-route';

export const checkoutLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  // Guest checkout: auth happens inline on the Information step (no login redirect).
  component: () => <CheckoutLayout />,
});

export const checkoutIndexRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: '/',
  component: CheckoutInformationPage,
});

/** Legacy shipping step — permanently redirect to payment. */
export const checkoutShippingRoute = createRoute({
  getParentRoute: () => checkoutLayoutRoute,
  path: 'shipping',
  beforeLoad: () => {
    throw redirect({ to: ROUTES.checkoutPayment });
  },
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
