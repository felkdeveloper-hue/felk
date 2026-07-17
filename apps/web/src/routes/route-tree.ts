import {
  accountAddressesRoute,
  accountOrderDetailRoute,
  accountOrderInvoiceRoute,
  accountOrdersRoute,
  accountPreferencesRoute,
  accountProfileRoute,
  accountReturnsRoute,
  accountRoute,
  accountSecurityRoute,
  legacyOrdersRoute,
} from './customer.routes';
import {
  checkoutCancelRoute,
  checkoutIndexRoute,
  checkoutLayoutRoute,
  checkoutPaymentRoute,
  checkoutReviewRoute,
  checkoutShippingRoute,
  checkoutSuccessRoute,
} from './checkout.routes';
import {
  authForgotPasswordRoute,
  authIndexRoute,
  authLoginRoute,
  authRegisterRoute,
  authResetPasswordRoute,
  authVerifyEmailRoute,
} from './auth.routes';
import { authLayoutRoute, customerLayoutRoute, publicLayoutRoute } from './layout-routes';
import { notFoundRoute } from './not-found.routes';
import {
  aboutRoute,
  cartRoute,
  categoriesRoute,
  categoryDetailRoute,
  contactRoute,
  indexRoute,
  legacyVerifyEmailRoute,
  privacyRoute,
  productDetailRoute,
  productsRoute,
  searchRoute,
  termsRoute,
  wishlistRoute,
} from './public.routes';
import { rootRoute } from './root-route';

const publicRouteTree = publicLayoutRoute.addChildren([
  indexRoute,
  productsRoute,
  productDetailRoute,
  categoriesRoute,
  categoryDetailRoute,
  searchRoute,
  cartRoute,
  wishlistRoute,
  aboutRoute,
  contactRoute,
  privacyRoute,
  termsRoute,
  legacyVerifyEmailRoute,
]);

const authRouteTree = authLayoutRoute.addChildren([
  authIndexRoute,
  authLoginRoute,
  authRegisterRoute,
  authVerifyEmailRoute,
  authForgotPasswordRoute,
  authResetPasswordRoute,
]);

const customerRouteTree = customerLayoutRoute.addChildren([
  accountRoute,
  accountProfileRoute,
  accountSecurityRoute,
  accountAddressesRoute,
  accountPreferencesRoute,
  accountOrdersRoute,
  accountOrderDetailRoute,
  accountOrderInvoiceRoute,
  accountReturnsRoute,
  legacyOrdersRoute,
]);

const checkoutRouteTree = checkoutLayoutRoute.addChildren([
  checkoutIndexRoute,
  checkoutShippingRoute,
  checkoutPaymentRoute,
  checkoutReviewRoute,
  checkoutSuccessRoute,
  checkoutCancelRoute,
]);

export const routeTree = rootRoute.addChildren([
  publicRouteTree,
  authRouteTree,
  customerRouteTree,
  checkoutRouteTree,
  notFoundRoute,
]);

export { authLoginRoute as authRoute };
