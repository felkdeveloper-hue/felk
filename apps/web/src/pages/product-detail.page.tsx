import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import {
  FrequentlyBoughtTogetherPlaceholder,
  PriceDisplay,
  ProductBreadcrumb,
  ProductGallery,
  RelatedProducts,
  ShareButtons,
  VariantSelector,
} from '@/components/catalog';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useProductDetail, useRecentlyViewed } from '@/hooks/catalog';
import { buildProductJsonLd } from '@/lib/seo';

export function ProductDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const query = useProductDetail(slug);
  const product = query.data;
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();

  useRecentlyViewed(product);

  useEffect(() => {
    if (product?.defaultVariantId) setSelectedVariantId(product.defaultVariantId);
    else if (product?.variants?.[0]?.id) setSelectedVariantId(product.variants[0].id);
  }, [product?.defaultVariantId, product?.variants]);

  const selectedVariant = useMemo(
    () =>
      product?.variants?.find((variant) => variant.id === selectedVariantId) ??
      product?.variants?.[0],
    [product?.variants, selectedVariantId],
  );

  if (query.isLoading) {
    return (
      <Container className="py-14">
        <ProductGridSkeleton count={1} className="max-w-md" />
      </Container>
    );
  }

  if (query.isError || !product) {
    return (
      <Container className="py-14">
        <ErrorState title="Product not found" onRetry={() => void query.refetch()} />
      </Container>
    );
  }

  const media = product.media?.length
    ? product.media
    : product.thumbnailUrl
      ? [{ id: 'primary', url: product.thumbnailUrl, alt: product.name, isPrimary: true }]
      : [];

  const price =
    selectedVariant?.salePrice ?? selectedVariant?.price ?? product.salePrice ?? product.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;

  return (
    <>
      <Seo
        title={product.name}
        description={product.shortDescription ?? product.description}
        image={media[0]?.url}
        url={buildAbsoluteUrl(`/products/${product.slug}`)}
        siteName={siteConfig.name}
        type="product"
        jsonLd={buildProductJsonLd({
          name: product.name,
          description: product.shortDescription ?? product.description,
          images: media.map((item) => item.url),
          sku: selectedVariant?.sku ?? product.sku,
          price: price?.amount,
          currency: price?.currency,
          inStock: product.status !== 'out_of_stock',
          url: buildAbsoluteUrl(`/products/${product.slug}`),
        })}
      />

      <Container className="py-8 sm:py-12">
        <ProductBreadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shop', href: '/products' },
            { label: product.name },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery media={media} productName={product.name} />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="space-y-3">
              {product.brandName ? (
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {product.brandName}
                </p>
              ) : null}
              <h1 className="font-display text-foreground text-4xl font-bold uppercase tracking-tight sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              {product.shortDescription ? (
                <p className="text-muted-foreground max-w-xl">{product.shortDescription}</p>
              ) : null}
            </div>

            <PriceDisplay
              size="md"
              price={selectedVariant?.price ?? product.price}
              salePrice={selectedVariant?.salePrice ?? product.salePrice ?? product.effectivePrice}
              compareAtPrice={compareAt}
            />

            <div className="flex flex-wrap gap-2">
              {product.isNewArrival ? (
                <Badge className="bg-foreground text-background rounded-full">New</Badge>
              ) : null}
              {product.isOnSale ? (
                <Badge className="bg-accent text-accent-foreground rounded-full">Sale</Badge>
              ) : null}
              {product.status === 'out_of_stock' ? (
                <Badge variant="outline" className="rounded-full">
                  Sold out
                </Badge>
              ) : null}
            </div>

            {product.variants?.length ? (
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariantId}
                onSelect={setSelectedVariantId}
              />
            ) : null}

            <div className="hidden flex-wrap gap-3 pt-2 sm:flex">
              <AddToCartButton
                product={product}
                variantId={selectedVariantId}
                size="lg"
                className="min-w-52 flex-1"
              />
              <WishlistButton
                product={product}
                variantId={selectedVariantId}
                iconOnly={false}
                variant="outline"
                size="lg"
              />
            </div>

            <div className="text-muted-foreground space-y-1 text-sm">
              {(selectedVariant?.sku ?? product.sku) ? (
                <p>
                  SKU:{' '}
                  <span className="text-foreground">{selectedVariant?.sku ?? product.sku}</span>
                </p>
              ) : null}
              <p>
                Availability:{' '}
                <span className="text-foreground">
                  {product.status === 'out_of_stock' ? 'Out of stock' : 'In stock'}
                </span>
              </p>
            </div>

            <ShareButtons title={product.name} slug={product.slug} />
          </motion.div>
        </div>

        {product.description ? (
          <section aria-labelledby="product-description" className="mt-16 max-w-3xl space-y-4">
            <h2 id="product-description" className="font-display text-2xl font-bold uppercase">
              Description
            </h2>
            <div className="prose prose-neutral dark:prose-invert">{product.description}</div>
          </section>
        ) : null}

        {Array.isArray(product.specifications) && product.specifications.length ? (
          <section aria-labelledby="product-specifications" className="mt-12 max-w-3xl space-y-4">
            <h2 id="product-specifications" className="font-display text-2xl font-bold uppercase">
              Specifications
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {product.specifications.map((spec, index) => {
                const record = spec as Record<string, unknown>;
                return (
                  <div
                    key={index}
                    className="border-border/80 bg-card rounded-2xl border p-4 shadow-[var(--shadow-soft)]"
                  >
                    <dt className="text-muted-foreground text-sm">
                      {String(record.label ?? record.key ?? record.name ?? 'Spec')}
                    </dt>
                    <dd className="text-foreground font-medium">{String(record.value ?? '—')}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}
      </Container>

      <div className="glass-panel border-border/70 fixed inset-x-3 bottom-[5.25rem] z-40 rounded-2xl border p-3 shadow-[var(--shadow-elevated)] sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <PriceDisplay
              size="sm"
              price={selectedVariant?.price ?? product.price}
              salePrice={selectedVariant?.salePrice ?? product.salePrice ?? product.effectivePrice}
              compareAtPrice={compareAt}
            />
          </div>
          <AddToCartButton product={product} variantId={selectedVariantId} size="sm" />
        </div>
      </div>

      <FrequentlyBoughtTogetherPlaceholder />
      <RelatedProducts productId={product.id} />
    </>
  );
}
