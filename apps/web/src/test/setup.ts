import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';
import { resetCartFixtures } from './msw/cart-fixtures';
import { resetCheckoutFixtures } from './msw/checkout-fixtures';
import { resetOrderFixtures } from './msw/order-fixtures';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
  server.listen({ onUnhandledRequest: 'warn' });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetCartFixtures();
  resetCheckoutFixtures();
  resetOrderFixtures();
});
afterAll(() => server.close());
