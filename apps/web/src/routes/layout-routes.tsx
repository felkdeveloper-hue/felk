import { createRoute } from '@tanstack/react-router';
import { AuthLayout, CustomerLayout, PublicLayout } from '@/layouts';
import { GuestRoute, ProtectedRoute } from '@/guards';
import { rootRoute } from './root-route';

/**
 * Layout routes wrap matched children in the corresponding layout shell
 * (and, where relevant, an auth guard).
 */

export const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicLayout,
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
