import { createRouter } from '@tanstack/react-router';
import { NotFoundPage } from '@/pages';
import { routeTree } from './route-tree';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFoundPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
