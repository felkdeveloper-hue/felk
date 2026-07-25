import { createRoute } from '@tanstack/react-router';
import { AuthLayout, CustomerLayout, PublicLayout } from '@/layouts';
import { GuestRoute, ProtectedRoute } from '@/guards';
import { prefetchStorefrontBootstrap } from '@/lib/prefetch-storefront-bootstrap';
import { rootRoute } from './root-route';

/**
 * Layout routes wrap matched children in the corresponding layout shell
 * (and, where relevant, an auth guard).
 */

export const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicLayout,
  // Warm the shared bootstrap cache without awaiting it. Returning the promise
  // here made every public route wait on the API, so a cold backend produced a
  // blank screen for as long as the request took to resolve.
  beforeLoad: ({ context }) => {
    void prefetchStorefrontBootstrap(context.queryClient);
  },
});

export const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-layout',
  component: () => (
    <GuestRoute>
      <AuthLayout />
    </GuestRoute>
  ),
});

export const customerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'customer-layout',
  component: () => (
    <ProtectedRoute>
      <CustomerLayout />
    </ProtectedRoute>
  ),
});
