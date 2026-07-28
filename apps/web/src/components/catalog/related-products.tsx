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

  // Hide quietly while loading fails or there is nothing to show — never flash a red error here.
  if (query.isError || (!query.isLoading && !products.length)) return null;

  return (
    <Section spacing="sm" title={title} className="lg:py-6">
      <Container>
        {query.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <HorizontalCarousel
            label={title}
            alwaysShowControls
            itemClassName="w-[68%] sm:w-[38%] lg:w-[22%]"
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                sizes="(max-width: 640px) 68vw, (max-width: 1024px) 38vw, 22vw"
              />
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
