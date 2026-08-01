import { createRoute, redirect } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';
import {
  applyClientCatalogFilters,
  catalogSearchToProductParams,
  CATALOG_BATCH_SIZE,
  CATALOG_MAX_PRODUCTS,
  parseCatalogSearch,
} from '@/utils/catalog';
import {
  AboutPage,
  CartPage,
  CategoriesPage,
  CategoryDetailPage,
  ContactPage,
  HomePage,
  PrivacyPage,
  ProductDetailPage,
  ProductsPage,
  SearchPage,
  TermsPage,
  TrackOrderPage,
  WishlistPage,
} from '@/pages';
import { publicLayoutRoute } from './layout-routes';

export const indexRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.home,
  component: HomePage,
});

export const productsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.products,
  validateSearch: (search: Record<string, unknown>) => parseCatalogSearch(search),
  beforeLoad: ({ context, search }) => {
    // Kick the first page fetch as early as the route resolves (parallel with layout paint).
    const state = parseCatalogSearch(search as Record<string, unknown>);
    const baseParams = catalogSearchToProductParams({
      ...state,
      page: undefined,
      limit: CATALOG_BATCH_SIZE,
    });
    void context.queryClient.prefetchInfiniteQuery({
      queryKey: QUERY_KEYS.products.list({
        ...baseParams,
        infinite: true,
        max: CATALOG_MAX_PRODUCTS,
        client: state,
      }),
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const result = await productsApi.list({ ...baseParams, page: pageParam as number });
        return {
          ...result,
          data: applyClientCatalogFilters(result.data, state),
        };
      },
      staleTime: 1000 * 60 * 2,
    });
  },
  component: ProductsPage,
});

export const productDetailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/products/$slug',
  validateSearch: (search: Record<string, unknown>): { variant?: string; color?: string } => {
    const result: { variant?: string; color?: string } = {};
    if (typeof search.variant === 'string') result.variant = search.variant;
    if (typeof search.color === 'string') result.color = search.color;
    return result;
  },
  beforeLoad: ({ context, params }) => {
    void context.queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.products.detail(params.slug),
      queryFn: () => productsApi.getBySlugOrId(params.slug),
      staleTime: 1000 * 60 * 5,
    });
  },
  component: ProductDetailPage,
});

export const categoriesRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.categories,
  component: CategoriesPage,
});

export const categoryDetailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/categories/$slug',
  beforeLoad: ({ params }) => {
    if (params.slug === 'men' || params.slug === 'women') {
      throw redirect({ to: ROUTES.products, search: { gender: params.slug } });
    }
  },
  component: CategoryDetailPage,
});

export const searchRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.search,
  component: SearchPage,
});

export const cartRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.cart,
  component: CartPage,
});

export const wishlistRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.wishlist,
  component: WishlistPage,
});

export const aboutRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.about,
  component: AboutPage,
});

export const contactRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.contact,
  component: ContactPage,
});

export const privacyRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.privacy,
  component: PrivacyPage,
});

export const termsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.terms,
  component: TermsPage,
});

export const trackOrderRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: ROUTES.trackOrder,
  validateSearch: (search: Record<string, unknown>): { orderNumber?: string; email?: string } => {
    const result: { orderNumber?: string; email?: string } = {};
    if (typeof search.orderNumber === 'string') result.orderNumber = search.orderNumber;
    if (typeof search.email === 'string') result.email = search.email;
    return result;
  },
  component: TrackOrderPage,
});

/** Legacy email links from the API point to `/verify-email`. */
export const legacyVerifyEmailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/verify-email',
  beforeLoad: ({ search }) => {
    throw redirect({ to: ROUTES.authVerifyEmail, search });
  },
});
