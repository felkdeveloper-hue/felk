import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useProductRail, type ProductRailKind } from '@/hooks/storefront/use-product-rail';
import { Section } from '@/components/common/section';
import { Button } from '@/components/ui/button';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { ROUTES } from '@/constants';
import { AsyncSection } from './async-section';
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
};

export interface ProductRailSectionProps {
  kind: ProductRailKind;
  title?: string;
  description?: string;
  eyebrow?: string;
}

export function ProductRailSection({ kind, title, description, eyebrow }: ProductRailSectionProps) {
  const copy = railCopy[kind];
  const query = useProductRail(kind);

  return (
    <Section
      spacing="default"
      className={
        kind === 'trending'
          ? 'from-muted/70 via-background to-background bg-gradient-to-b'
          : kind === 'best-sellers'
            ? 'bg-foreground/[0.025]'
            : undefined
      }
      eyebrow={eyebrow ?? copy.eyebrow}
      title={title ?? copy.title}
      description={description ?? copy.description}
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
        data={query.data}
        isEmpty={(result) => !result?.data?.length}
        onRetry={() => void query.refetch()}
        skeleton={
          <div className="px-4 sm:px-6 lg:px-10">
            <ProductGridSkeleton count={4} />
          </div>
        }
        emptyTitle="Products coming soon"
        emptyDescription="Our catalog is being curated. Check back shortly."
      >
        {(result) => (
          <MotionReveal>
            <HorizontalCarousel
              label={title ?? copy.title}
              itemClassName="w-[72%] sm:w-[40%] lg:w-[26%] 2xl:w-[20%]"
            >
              {result.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </HorizontalCarousel>
          </MotionReveal>
        )}
      </AsyncSection>
    </Section>
  );
}
