import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { ProductCard } from '@/components/catalog/product-card';
import type { Product } from '@/services/sdk';

const product: Product = {
  id: 'prod_1',
  name: 'Silk Column Dress',
  slug: 'silk-column-dress',
  status: 'active',
  brandName: 'Forma Atelier',
  price: { amount: 420, currency: 'USD' },
  salePrice: { amount: 315, currency: 'USD' },
  isOnSale: true,
  discountPercent: 25,
  isNewArrival: true,
  averageRating: 4.6,
  thumbnailUrl: 'https://example.com/dress.jpg',
  defaultVariantId: 'var_1',
};

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <ProductCard product={product} />,
});
const productRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products/$slug',
  component: () => null,
});
const routeTree = rootRoute.addChildren([indexRoute, productRoute]);
const router = createRouter({ routeTree });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('ProductCard', () => {
  it('renders brand, name, price, discount, and rating', async () => {
    await router.load();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Forma Atelier')).toBeInTheDocument();
    expect(screen.getByText('Silk Column Dress')).toBeInTheDocument();
    expect(screen.getByText('$315.00')).toBeInTheDocument();
    expect(screen.getByText('$420.00')).toBeInTheDocument();
    expect(screen.getByText('25% OFF')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 4.6 out of 5')).toBeInTheDocument();
    expect(screen.getByText(/Get it for as low as/i)).toBeInTheDocument();
  });

  it('shows the new badge', async () => {
    await router.load();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
