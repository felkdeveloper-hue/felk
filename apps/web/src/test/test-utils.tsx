import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  type Router,
} from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useAuthStore } from '@/store';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function seedAuthSession() {
  useAuthStore.setState({
    accessToken: 'access_test',
    refreshToken: 'refresh_test',
    user: {
      id: 'user_test',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['customer'],
      permissions: [],
      isEmailVerified: true,
    },
    hasHydrated: true,
  });
}

export function clearAuthSession() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    hasHydrated: true,
  });
}

interface TestRouterOptions {
  initialPath?: string;
  component: () => ReactElement;
  path?: string;
}

export function createTestRouter({ initialPath = '/', component, path = '/' }: TestRouterOptions) {
  const rootRoute = createRootRoute();
  const indexRoute = createRouteLike(rootRoute, path, component);
  const routeTree = rootRoute.addChildren([indexRoute]);
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({ routeTree, history });
  return router;
}

function createRouteLike(
  parent: ReturnType<typeof createRootRoute>,
  path: string,
  component: () => ReactElement,
) {
  return {
    getParentRoute: () => parent,
    path,
    component,
  } as never;
}

interface RenderWithProvidersOptions extends RenderOptions {
  router?: Router<never>;
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    if (options.router) {
      return (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={options.router} />
        </QueryClientProvider>
      );
    }

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
