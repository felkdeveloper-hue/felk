/**
 * k6 smoke / soak script (install k6 separately: https://k6.io)
 *
 *   k6 run -e BASE_URL=http://localhost:4000 -e VUS=500 apps/api/src/test/load/k6-smoke.js
 *   k6 run -e BASE_URL=http://localhost:4000 -e VUS=5000 apps/api/src/test/load/k6-smoke.js
 *
 * For catalog/order scale tests, seed 100k products / 1M orders in staging first,
 * then point paths at list/search endpoints you care about for dashboard indexes.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4000';
const VUS = Number(__ENV.VUS || 100);

export const options = {
  vus: VUS,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/api/v1/system/health`);
  check(health, { 'health 2xx': (r) => r.status >= 200 && r.status < 300 });

  const products = http.get(`${BASE_URL}/api/v1/catalog/products?limit=20`);
  check(products, {
    'products reachable': (r) => r.status === 200 || r.status === 401 || r.status === 403,
  });

  sleep(0.2);
}
