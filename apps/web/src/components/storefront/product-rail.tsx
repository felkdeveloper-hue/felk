import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
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
  'more-to-love': {
    eyebrow: 'Keep exploring',
    title: 'More to love',
    description: 'Hand-picked pieces we think you will love next.',
  },
  featured: {
    eyebrow: 'Editor’s pick',
    title: 'Featured products',
    description: 'Standout styles from this week’s edit.',
  },
  random: {
    eyebrow: 'From the edit',
    title: 'Picked for you',
    description: 'A mix of pieces from across the store.',
  },
};

export interface ProductRailSectionProps {
  kind: ProductRailKind;
  title?: string | false;
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
  /** Optional custom header rendered above the rail (replaces default title). */
  header?: ReactNode;
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
  header,
}: ProductRailSectionProps) {
  const copy = railCopy[kind];
  const { ref, inView } = useInView({ immediate: eager, rootMargin: '320px 0px' });
  const query = useProductRail(kind, scope, { enabled: inView });
  const isEmpty = !query.isLoading && !query.isError && !query.data?.data?.length;
  const hasProducts = Boolean(query.data?.data?.length);
  const resolvedTitle = header ? undefined : title === false ? undefined : (title ?? copy.title);
  const railLabel = typeof title === 'string' ? title : header ? 'Best Seller' : copy.title;

  // After retries fail, hide the whole rail (title included) — no red error blocks.
  if (inView && query.isError && !query.isFetching && !hasProducts) return null;
  if (hideWhenEmpty && inView && isEmpty) return null;

  return (
    <div ref={ref}>
      {header ? <div className="mb-4 sm:mb-5">{header}</div> : null}
      <Section
        spacing={spacing}
        titleAlign={titleAlign}
        className={
          kind === 'trending'
            ? 'from-muted/70 via-background to-background bg-gradient-to-b'
            : kind === 'best-sellers'
              ? 'bg-background'
              : undefined
        }
        title={resolvedTitle}
        action={
          header ? undefined : (
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to={ROUTES.products}>
                View all
                <ArrowRight />
              </Link>
            </Button>
          )
        }
      >
        {!inView || query.isLoading || (query.isFetching && !hasProducts) ? (
          <div className="px-4 sm:px-4 lg:px-6">
            <ProductGridSkeleton count={4} />
          </div>
        ) : hasProducts ? (
          <HorizontalCarousel
            label={railLabel}
            itemClassName="w-[46%] sm:w-[52%] md:w-[40%] lg:w-[31%] xl:w-[24%]"
            scrollByItem
          >
            {query.data!.data.map((product, index) => (
              <ProductCard
                key={`${product.id}-${product.defaultVariantId ?? 'default'}`}
                product={product}
                priority={eager && index < 2}
                sizes="(max-width: 640px) 46vw, (max-width: 768px) 52vw, (max-width: 1024px) 40vw, (max-width: 1280px) 31vw, 24vw"
              />
            ))}
          </HorizontalCarousel>
        ) : null}
      </Section>
    </div>
  );
}
