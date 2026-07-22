import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import {
  useProductRail,
  type ProductRailKind,
  type ProductRailScope,
} from '@/hooks/storefront/use-product-rail';
import { useInView } from '@/hooks/use-in-view';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { ROUTES } from '@/constants';
import { HorizontalCarousel } from './horizontal-carousel';
import { MotionReveal } from './motion-reveal';
import { ProductCard } from './product-card';

const railCopy: Record<ProductRailKind, { eyebrow: string; title: string; description: string }> = {
  trending: {
    eyebrow: 'Trending now',
    title: 'Trending products',
    description: 'The pieces everyone is talking about this week.',
  },
  'best-sellers': {
    eyebrow: 'Customer favorites',
    title: 'Best sellers',
    description: 'Our most-loved styles, season after season.',
  },
  'new-arrivals': {
    eyebrow: 'Just dropped',
    title: 'New arrivals',
    description: 'Fresh silhouettes and fabrics, added weekly.',
  },
  random: {
    eyebrow: 'From the edit',
    title: 'Picked for you',
    description: 'A mix of pieces from across the store.',
  },
};

export interface ProductRailSectionProps {
  kind: ProductRailKind;
  title?: string;
  description?: string;
  eyebrow?: string;
  scope?: ProductRailScope;
  /** Hide the whole section when the rail has no products. */
  hideWhenEmpty?: boolean;
  /**
   * When false (default for below-fold), wait until near viewport before fetching.
   * Pass true for the first above-the-fold rail only.
   */
  eager?: boolean;
  spacing?: 'none' | 'sm' | 'default' | 'lg';
  titleAlign?: 'start' | 'center';
}

export function ProductRailSection({
  kind,
  title,
  description: _description,
  eyebrow: _eyebrow,
  scope,
  hideWhenEmpty = true,
  eager = false,
  spacing = 'sm',
  titleAlign = 'start',
}: ProductRailSectionProps) {
  const copy = railCopy[kind];
  const { ref, inView } = useInView({ immediate: eager, rootMargin: '320px 0px' });
  const query = useProductRail(kind, scope, { enabled: inView });
  const isEmpty = !query.isLoading && !query.isError && !query.data?.data?.length;
  const hasProducts = Boolean(query.data?.data?.length);

  // After retries fail, hide the whole rail (title included) — no red error blocks.
  if (inView && query.isError && !query.isFetching && !hasProducts) return null;
  if (hideWhenEmpty && inView && isEmpty) return null;

  return (
    <div ref={ref}>
      <Section
        spacing={spacing}
        titleAlign={titleAlign}
        className={
          kind === 'trending'
            ? 'from-muted/70 via-background to-background bg-gradient-to-b'
            : kind === 'best-sellers'
              ? 'bg-foreground/[0.025]'
              : undefined
        }
        title={title ?? copy.title}
        action={
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to={ROUTES.products}>
              View all
              <ArrowRight />
            </Link>
          </Button>
        }
      >
        {!inView || query.isLoading || (query.isFetching && !hasProducts) ? (
          <div className="px-3 sm:px-4 lg:px-6">
            <ProductGridSkeleton count={4} />
          </div>
        ) : hasProducts ? (
          <MotionReveal>
            <HorizontalCarousel
              label={title ?? copy.title}
              itemClassName="w-[82%] sm:w-[48%] md:w-[40%] lg:w-[31%] xl:w-[24%]"
              scrollByItem
            >
              {query.data!.data.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={eager && index < 2}
                  sizes="(max-width: 640px) 82vw, (max-width: 768px) 48vw, (max-width: 1024px) 40vw, (max-width: 1280px) 31vw, 24vw"
                />
              ))}
            </HorizontalCarousel>
          </MotionReveal>
        ) : null}
      </Section>
    </div>
  );
}
