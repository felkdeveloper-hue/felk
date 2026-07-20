import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { productsApi, type Product } from '@/services/sdk';
import { AsyncSection } from './async-section';
import { MotionItem, MotionReveal } from './motion-reveal';
import { ProductCard } from './product-card';

const GRID_COUNT = 12; // 4 columns × 3 rows

const gridLayoutClass =
  'w-full grid grid-cols-2 gap-3 px-3 sm:grid-cols-2 sm:gap-4 sm:px-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 lg:px-5 xl:px-6';

function shuffleProducts(products: Product[]): Product[] {
  const next = [...products];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function ProductGridSection() {
  const query = useQuery({
    queryKey: QUERY_KEYS.products.list({ rail: 'home-grid', status: 'active', limit: 36 }),
    queryFn: () =>
      productsApi.list({
        status: 'active',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 36,
      }),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const products = useMemo(() => {
    if (!query.data?.data?.length) return [];
    return shuffleProducts(query.data.data).slice(0, GRID_COUNT);
  }, [query.data]);

  return (
    <Section
      spacing="default"
      className="bg-background"
      eyebrow="Shop the edit"
      title="Featured products"
      description="Four across, three rows — a curated mix from the collection."
      action={
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <Link to={ROUTES.products}>
            View all
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error ?? undefined}
        data={products}
        isEmpty={(items) => !items.length}
        onRetry={() => void query.refetch()}
        skeleton={<ProductGridSkeleton count={GRID_COUNT} className={gridLayoutClass} />}
        emptyTitle="Products coming soon"
      >
        {(items) => (
          <MotionReveal stagger className={gridLayoutClass}>
            {items.map((product) => (
              <MotionItem key={product.id}>
                <ProductCard product={product} />
              </MotionItem>
            ))}
          </MotionReveal>
        )}
      </AsyncSection>
    </Section>
  );
}
