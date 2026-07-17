import { createRoute, redirect } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
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
  component: ProductsPage,
});

export const productDetailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/products/$slug',
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

/** Legacy email links from the API point to `/verify-email`. */
export const legacyVerifyEmailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/verify-email',
  beforeLoad: ({ search }) => {
    throw redirect({ to: ROUTES.authVerifyEmail, search });
  },
});
