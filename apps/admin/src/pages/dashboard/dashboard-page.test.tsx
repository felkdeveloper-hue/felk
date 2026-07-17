import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { useAuthStore } from '@/store';
import { adminUserFixture } from '@/test/msw/fixtures';
import { renderWithProviders } from '@/test/test-utils';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const routeTree = rootRoute.addChildren([dashboardRoute]);

function renderDashboard() {
  const history = createMemoryHistory({ initialEntries: ['/'] });
  const router = createRouter({ routeTree, history });
  return renderWithProviders(<RouterProvider router={router} />);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: adminUserFixture,
      accessToken: 'token',
      refreshToken: 'refresh',
      hasHydrated: true,
    });
  });

  it('renders overview cards from API data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(await screen.findByText('ORD-1001')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });
});
