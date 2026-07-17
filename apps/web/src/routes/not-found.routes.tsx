import { createRoute } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { NotFoundPage } from '@/pages';
import { rootRoute } from './root-route';

/**
 * Explicit `/not-found` route (linkable), distinct from the router's
 * `notFoundComponent` (registered on `rootRoute`) which catches unmatched
 * paths automatically.
 */
export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.notFound,
  component: NotFoundPage,
});
