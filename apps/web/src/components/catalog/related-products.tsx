import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { HorizontalCarousel } from '@/components/storefront/horizontal-carousel';
import { useRelatedProducts } from '@/hooks/catalog';
import { ProductCard } from './product-card';

export interface RelatedProductsProps {
  productId: string;
  title?: string;
}

export function RelatedProducts({ productId, title = 'You May Also Like' }: RelatedProductsProps) {
  const query = useRelatedProducts(productId);

  const products =
    query.data
      ?.map((item) => item.relatedProduct)
      .filter((product): product is NonNullable<typeof product> => Boolean(product)) ?? [];

  if (!query.isLoading && !products.length) return null;

  return (
    <Section spacing="default" title={title}>
      <Container>
        {query.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <HorizontalCarousel
            label={title}
            alwaysShowControls
            itemClassName="w-[55%] sm:w-[35%] lg:w-[22%]"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </HorizontalCarousel>
        )}
      </Container>
    </Section>
  );
}

export function FrequentlyBoughtTogetherPlaceholder() {
  return null;
}
