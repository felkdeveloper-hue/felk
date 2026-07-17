import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { PermissionRoute } from '@/guards/permission-route';
import { ADMIN_ROUTES, PERMISSIONS } from '@/constants';
import { useAuthStore } from '@/store';
import { adminUserFixture, limitedUserFixture } from '@/test/msw/fixtures';

function ProtectedContent() {
  return <p>Secret content</p>;
}

function ForbiddenPage() {
  return <p>Forbidden page</p>;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const forbiddenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ADMIN_ROUTES.forbidden,
  component: ForbiddenPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
      <ProtectedContent />
    </PermissionRoute>
  ),
});

const routeTree = rootRoute.addChildren([forbiddenRoute, protectedRoute]);

function renderWithRouter() {
  const history = createMemoryHistory({ initialEntries: ['/'] });
  const router = createRouter({ routeTree, history });
  return render(<RouterProvider router={router} />);
}

describe('PermissionRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: adminUserFixture,
      accessToken: 'token',
      refreshToken: 'refresh',
      hasHydrated: true,
    });
  });

  it('renders children when user has permission', async () => {
    renderWithRouter();
    expect(await screen.findByText('Secret content')).toBeInTheDocument();
  });

  it('redirects when user lacks permission', async () => {
    useAuthStore.setState({ user: limitedUserFixture });
    renderWithRouter();
    expect(await screen.findByText('Forbidden page')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });
});
