import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { useInView } from '@/hooks/use-in-view';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { productsApi, type Product } from '@/services/sdk';
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

export function ProductGridSection({
  spacing = 'sm',
}: {
  spacing?: 'none' | 'sm' | 'default' | 'lg';
}) {
  const { ref, inView } = useInView({ rootMargin: '400px 0px' });

  const query = useQuery({
    queryKey: QUERY_KEYS.products.list({ rail: 'home-grid', status: 'active', limit: GRID_COUNT }),
    queryFn: () =>
      productsApi.list({
        status: 'active',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: GRID_COUNT,
      }),
    staleTime: 1000 * 60 * 3,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
    enabled: inView,
  });

  const products = useMemo(() => {
    if (!query.data?.data?.length) return [];
    return shuffleProducts(query.data.data).slice(0, GRID_COUNT);
  }, [query.data]);

  if (inView && query.isError && !query.isFetching && !products.length) return null;
  if (inView && !query.isLoading && !query.isFetching && !products.length) return null;

  return (
    <div ref={ref}>
      <Section
        spacing={spacing}
        className="bg-background"
        title="Featured products"
        titleAlign="center"
        action={
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to={ROUTES.products}>
              View all
              <ArrowRight />
            </Link>
          </Button>
        }
      >
        {!inView || query.isLoading || (query.isFetching && !products.length) ? (
          <ProductGridSkeleton count={GRID_COUNT} className={gridLayoutClass} />
        ) : (
          <MotionReveal stagger className={gridLayoutClass}>
            {products.map((product, index) => (
              <MotionItem key={product.id}>
                <ProductCard
                  product={product}
                  priority={index < 4}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </MotionItem>
            ))}
          </MotionReveal>
        )}
      </Section>
    </div>
  );
}
