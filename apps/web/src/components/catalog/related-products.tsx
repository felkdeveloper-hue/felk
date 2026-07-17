import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import { useRelatedProducts } from '@/hooks/catalog';
import { ProductGrid } from './product-grid';

export interface RelatedProductsProps {
  productId: string;
  title?: string;
}

export function RelatedProducts({ productId, title = 'Related products' }: RelatedProductsProps) {
  const query = useRelatedProducts(productId);

  return (
    <Section spacing="default" title={title}>
      <Container>
        {query.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <ProductGrid
            products={
              query.data
                ?.map((item) => item.relatedProduct)
                .filter((product): product is NonNullable<typeof product> => Boolean(product)) ?? []
            }
          />
        )}
      </Container>
    </Section>
  );
}

export function FrequentlyBoughtTogetherPlaceholder() {
  return (
    <Section
      spacing="default"
      title="Frequently bought together"
      description="Bundle recommendations coming soon."
    >
      <Container>
        <div className="border-border bg-muted/30 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
          Placeholder — curated bundles will appear here.
        </div>
      </Container>
    </Section>
  );
}
