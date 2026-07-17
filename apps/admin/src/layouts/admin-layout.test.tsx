import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AdminLayout } from '@/layouts/admin-layout';
import { renderWithProviders } from '@/test/test-utils';

const rootRoute = createRootRoute({ component: AdminLayout });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <p>Page content</p>,
});
const routeTree = rootRoute.addChildren([indexRoute]);

describe('AdminLayout accessibility', () => {
  it('provides a skip link to main content', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const router = createRouter({ routeTree, history });

    renderWithProviders(<RouterProvider router={router} />);

    expect(await screen.findByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#admin-main',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'admin-main');
  });
});
