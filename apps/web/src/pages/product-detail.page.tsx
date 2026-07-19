import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { BadgeCheck, Package, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import {
  FrequentlyBoughtTogetherPlaceholder,
  PriceDisplay,
  ProductBreadcrumb,
  ProductGallery,
  ProductReviewsSection,
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
  const specs = Array.isArray(product.specifications) ? product.specifications : [];
  const averageHint = product.isNewArrival ? 'New arrival' : null;

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

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
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
              <h1 className="font-display text-foreground text-3xl font-bold uppercase tracking-tight sm:text-4xl lg:text-5xl">
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

            <div className="hidden gap-3 pt-1 sm:flex">
              <AddToCartButton
                product={product}
                variantId={selectedVariantId}
                size="lg"
                className="text-foreground min-h-12 flex-1 rounded-xl bg-amber-400 font-semibold uppercase tracking-wide hover:bg-amber-400/90"
                label="Add to bag"
              />
              <WishlistButton
                product={product}
                variantId={selectedVariantId}
                iconOnly={false}
                variant="outline"
                size="lg"
                className="min-h-12 rounded-xl"
              />
            </div>

            {averageHint ? (
              <div className="text-foreground inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium">
                <span className="text-amber-500">★</span>
                {averageHint}
              </div>
            ) : null}

            {specs.length ? (
              <section aria-labelledby="key-highlights" className="space-y-3">
                <h2 id="key-highlights" className="text-sm font-semibold">
                  Key Highlights
                </h2>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {specs.slice(0, 6).map((spec, index) => {
                    const record = spec as Record<string, unknown>;
                    return (
                      <div
                        key={index}
                        className="bg-muted/50 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm"
                      >
                        <dt className="text-muted-foreground">
                          {String(record.label ?? record.key ?? record.name ?? 'Spec')}
                        </dt>
                        <dd className="text-foreground font-medium">
                          {String(record.value ?? '—')}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ) : null}

            <Accordion type="multiple" className="rounded-2xl border px-4">
              {product.description ? (
                <AccordionItem value="description">
                  <AccordionTrigger>
                    <div className="text-left">
                      <p className="font-semibold">Product Description</p>
                      <p className="text-muted-foreground text-xs font-normal">
                        Manufacture, care and fit
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-neutral dark:prose-invert text-sm">
                      {product.description}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : null}
              <AccordionItem value="returns">
                <AccordionTrigger>
                  <div className="text-left">
                    <p className="font-semibold">15 Days Returns & Exchange</p>
                    <p className="text-muted-foreground text-xs font-normal">
                      Know about return & exchange policy
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground text-sm">
                    Return or exchange eligible items within 15 days of delivery. Items must be
                    unused and in original packaging. Refunds are processed after quality check.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="grid grid-cols-3 gap-3 border-t pt-5 text-center">
              {[
                { icon: BadgeCheck, label: '100% Genuine Product' },
                { icon: ShieldCheck, label: '100% Secure Payment' },
                { icon: RefreshCcw, label: 'Easy Returns & Refunds' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <item.icon className="mx-auto size-7 text-amber-500" />
                  <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.08em]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-muted-foreground space-y-1 text-sm">
              {(selectedVariant?.sku ?? product.sku) ? (
                <p>
                  SKU:{' '}
                  <span className="text-foreground">{selectedVariant?.sku ?? product.sku}</span>
                </p>
              ) : null}
              <p className="flex items-center gap-2">
                <Package className="size-3.5" />
                Availability:{' '}
                <span className="text-foreground">
                  {product.status === 'out_of_stock' ? 'Out of stock' : 'In stock'}
                </span>
              </p>
            </div>

            <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950">
              This product is eligible for free shipping on qualifying orders.
            </div>

            <ShareButtons title={product.name} slug={product.slug} />
          </motion.div>
        </div>

        <ProductReviewsSection productId={product.id} />
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
          <AddToCartButton product={product} variantId={selectedVariantId} size="sm" label="Add" />
        </div>
      </div>

      <FrequentlyBoughtTogetherPlaceholder />
      <RelatedProducts productId={product.id} />
    </>
  );
}
