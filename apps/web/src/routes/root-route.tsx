import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { NotFoundPage } from '@/pages';
import { ErrorLayout } from '@/layouts';
import { RootComponent } from './root-component';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Root of the code-based route tree. Every other route (public, auth,
 * customer layouts) is registered as a child of this route via
 * `route-tree.ts`.
 */
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => (
    <ErrorLayout
      title="Something went wrong"
      description={error instanceof Error ? error.message : undefined}
      onRetry={() => window.location.reload()}
    />
  ),
});
