import { createRouter } from '@tanstack/react-router';
import { NotFoundPage } from '@/pages';
import { queryClient } from '@/lib/query-client';
import { routeTree } from './route-tree';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFoundPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
