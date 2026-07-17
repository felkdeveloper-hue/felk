import { http, HttpResponse } from 'msw';
import { adminUserFixture, orderListFixture, productListFixture } from './fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

export const handlers = [
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({ success: true, data: adminUserFixture });
  }),

  http.get(`${API_BASE}/catalog/products`, () => {
    return HttpResponse.json({ success: true, ...productListFixture });
  }),

  http.get(`${API_BASE}/orders`, () => {
    return HttpResponse.json({ success: true, ...orderListFixture });
  }),

  http.get(`${API_BASE}/customers`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
      meta: productListFixture.meta,
    });
  }),

  http.get(`${API_BASE}/payments`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
      meta: productListFixture.meta,
    });
  }),

  http.get(`${API_BASE}/inventory/items`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
      meta: productListFixture.meta,
    });
  }),

  http.get(`${API_BASE}/inventory/warehouses`, () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.get(`${API_BASE}/inventory/alerts`, () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
];
