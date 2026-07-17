import { createRoute, redirect } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import {
  AccountAddressesPage,
  AccountOrderDetailPage,
  AccountOrderInvoicePage,
  AccountOrdersPage,
  AccountPage,
  AccountPreferencesPage,
  AccountProfilePage,
  AccountReturnsPage,
  AccountSecurityPage,
} from '@/pages/account';
import { customerLayoutRoute } from './layout-routes';

export const accountRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.account,
  component: AccountPage,
});

export const accountProfileRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountProfile,
  component: AccountProfilePage,
});

export const accountSecurityRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountSecurity,
  component: AccountSecurityPage,
});

export const accountAddressesRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountAddresses,
  component: AccountAddressesPage,
});

export const accountPreferencesRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountPreferences,
  component: AccountPreferencesPage,
});

export const accountOrdersRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountOrders,
  component: AccountOrdersPage,
});

export const accountOrderDetailRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/account/orders/$orderId',
  component: AccountOrderDetailPage,
});

export const accountOrderInvoiceRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/account/orders/$orderId/invoice',
  component: AccountOrderInvoicePage,
});

export const accountReturnsRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: ROUTES.accountReturns,
  component: AccountReturnsPage,
});

/** Legacy redirect from /account/orders path alias via ROUTES.orders */
export const legacyOrdersRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: '/orders',
  beforeLoad: () => {
    throw redirect({ to: ROUTES.accountOrders });
  },
});
