import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { HorizontalCarousel } from '@/components/storefront/horizontal-carousel';
import { useRecentlyViewedProducts } from '@/hooks/catalog/use-recently-viewed-products';
import { ProductCard } from './product-card';

export interface RecentlyViewedSectionProps {
  productIds: string[];
  excludeProductId?: string;
}

export function RecentlyViewedSection({
  productIds,
  excludeProductId,
}: RecentlyViewedSectionProps) {
  const { products, isLoading } = useRecentlyViewedProducts(productIds, excludeProductId);

  if (!productIds.length) return null;

  return (
    <Section spacing="default" title="Recently Viewed">
      <Container>
        {isLoading ? (
          <ProductGridSkeleton count={2} />
        ) : products.length ? (
          <HorizontalCarousel
            label="Recently viewed products"
            alwaysShowControls
            itemClassName="w-[55%] sm:w-[35%] lg:w-[22%]"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </HorizontalCarousel>
        ) : null}
      </Container>
    </Section>
  );
}
