import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { LoginForm } from '@/components/auth/login-form';
import { ProtectedRoute } from '@/guards/protected-route';
import {
  clearAuthSession,
  createTestQueryClient,
  renderWithProviders,
  seedAuthSession,
} from '@/test/test-utils';

describe('LoginForm', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  it('shows validation errors for empty submission', async () => {
    const rootRoute = createRootRoute();
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/login',
      component: () => <LoginForm />,
    });
    const routeTree = rootRoute.addChildren([loginRoute]);
    const router = createRouter({ routeTree });
    await router.navigate({ to: '/auth/login' });

    renderWithProviders(<RouterProvider router={router} />, {
      queryClient: createTestQueryClient(),
    });

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  it('redirects unauthenticated users to login', async () => {
    const rootRoute = createRootRoute();
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/login',
      component: () => <div>Login page</div>,
    });
    const accountRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/account',
      component: () => (
        <ProtectedRoute>
          <div>Account content</div>
        </ProtectedRoute>
      ),
    });
    const routeTree = rootRoute.addChildren([loginRoute, accountRoute]);
    const router = createRouter({ routeTree });
    await router.navigate({ to: '/account' });

    renderWithProviders(<RouterProvider router={router} />, {
      queryClient: createTestQueryClient(),
    });

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument();
    });
  });

  it('renders children when authenticated', async () => {
    seedAuthSession();

    const rootRoute = createRootRoute();
    const accountRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/account',
      component: () => (
        <ProtectedRoute>
          <div>Account content</div>
        </ProtectedRoute>
      ),
    });
    const routeTree = rootRoute.addChildren([accountRoute]);
    const router = createRouter({ routeTree });
    await router.navigate({ to: '/account' });

    renderWithProviders(<RouterProvider router={router} />, {
      queryClient: createTestQueryClient(),
    });

    expect(await screen.findByText('Account content')).toBeInTheDocument();
  });
});
