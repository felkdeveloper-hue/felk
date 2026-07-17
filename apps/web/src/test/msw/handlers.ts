import { http, HttpResponse } from 'msw';
import { cmsHandlers } from './cms-fixtures';
import { catalogHandlers } from './catalog-fixtures';
import { authHandlers } from './auth-fixtures';
import { cartHandlers } from './cart-fixtures';
import { checkoutHandlers, paymentHandlers } from './checkout-fixtures';
import { orderHandlers } from './order-fixtures';

const API = 'http://localhost:4000/api/v1';

/** Default MSW handlers — extend per test with server.use(). */
export const handlers = [
  http.get(`${API}/system/health`, () =>
    HttpResponse.json({ success: true, message: 'OK', data: { status: 'ok' } }),
  ),
  ...authHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...paymentHandlers,
  ...orderHandlers,
  ...cmsHandlers,
  ...catalogHandlers,
];
