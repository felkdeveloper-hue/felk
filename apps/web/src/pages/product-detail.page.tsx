import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { ErrorState } from '@/components/ui/error-state';
import { ProductGridSkeleton } from '@/components/feedback/skeletons';
import {
  BackToTop,
  ProductBreadcrumb,
  ProductCategoryLinks,
  ProductGallery,
  ProductHighlights,
  ProductInfoAccordions,
  ProductPurchasePanel,
  ProductReviewsSection,
  ProductSpecsGrid,
  ProductTrustBadges,
  RecentlyViewedSection,
  RelatedProducts,
  SizeGuideModal,
} from '@/components/catalog';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { PriceDisplay } from '@/components/catalog/price-display';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { ROUTES } from '@/constants';
import {
  useProductDetail,
  useRecentlyViewed,
  useCatalogFilterFacets,
  useCategoriesList,
} from '@/hooks/catalog';
import { buildProductJsonLd } from '@/lib/seo';
import { partitionProductSpecs, hasMeaningfulText } from '@/utils/catalog/specifications';
import type { ProductVariant } from '@/services/sdk';

function resolveBadgeLabel(product: {
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  tags?: string[];
}): string | undefined {
  if (product.tags?.some((t) => /design of the week/i.test(t))) return 'Design of the Week';
  if (product.isFeatured) return 'Design of the Week';
  if (product.isTrending) return 'Trending';
  if (product.isNewArrival) return 'New Arrival';
  return undefined;
}

function resolveMaterialLabel(
  materialId: string | undefined,
  materials: { id: string; name: string }[],
  specifications?: unknown[],
): string | undefined {
  if (materialId) {
    const match = materials.find((m) => m.id === materialId);
    if (match) return match.name;
  }
  const spec = (specifications ?? []).find((s) => {
    if (!s || typeof s !== 'object') return false;
    const r = s as Record<string, unknown>;
    const label = String(r.label ?? r.key ?? '').toLowerCase();
    return label.includes('fabric') || label.includes('material');
  }) as Record<string, unknown> | undefined;
  if (spec?.value) return String(spec.value);
  return undefined;
}

export function ProductDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const query = useProductDetail(slug);
  const product = query.data;
  const { recentlyViewedIds } = useRecentlyViewed(product);
  const { sizes, materials } = useCatalogFilterFacets();
  const categoriesQuery = useCategoriesList();

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [selectedColorId, setSelectedColorId] = useState<string | undefined>();
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>();

  useEffect(() => {
    if (!product?.slug || product.slug === slug) return;
    if (/^[a-f0-9]{24}$/i.test(slug)) {
      navigate({ to: '/products/$slug', params: { slug: product.slug }, replace: true });
    }
  }, [navigate, product?.slug, slug]);

  useEffect(() => {
    if (!product?.variants?.length) return;
    const defaultVariant =
      product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0];
    if (!defaultVariant) return;
    setSelectedVariantId(defaultVariant.id);
    setSelectedColorId(defaultVariant.colorId);
    setSelectedSizeId(defaultVariant.sizeId);
  }, [product?.defaultVariantId, product?.variants]);

  const sizeLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const facet of sizes.data?.data ?? []) {
      map[facet.id] = facet.name;
    }
    return map;
  }, [sizes.data?.data]);

  const materialList = useMemo(
    () => (materials.data?.data ?? []).map((m) => ({ id: m.id, name: m.name })),
    [materials.data?.data],
  );

  const selectedVariant = useMemo(
    () =>
      product?.variants?.find((v: ProductVariant) => v.id === selectedVariantId) ??
      product?.variants?.[0],
    [product?.variants, selectedVariantId],
  );

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [{ label: 'Home', href: '/' }];
    const category = categoriesQuery.data?.data?.find((c) => c.id === product?.categoryId);
    if (category) {
      items.push({
        label: category.name,
        href: `/categories/${category.slug}`,
      });
    } else {
      items.push({ label: 'Shop', href: ROUTES.products });
    }
    if (product?.name) items.push({ label: product.name });
    return items;
  }, [categoriesQuery.data?.data, product?.categoryId, product?.name]);

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
  const { gridSpecs, returnPolicy, highlightSpecs } = partitionProductSpecs(specs);
  const badgeLabel = resolveBadgeLabel(product);
  const materialLabel = resolveMaterialLabel(product.materialId, materialList, gridSpecs);

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

      <SizeGuideModal />

      <Container className="py-6 sm:py-10">
        <ProductBreadcrumb className="mb-6" items={breadcrumbItems} />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <ProductGallery media={media} productName={product.name} badgeLabel={badgeLabel} />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <ProductPurchasePanel
              product={product}
              selectedVariantId={selectedVariantId}
              selectedColorId={selectedColorId}
              selectedSizeId={selectedSizeId}
              onVariantChange={setSelectedVariantId}
              onColorChange={setSelectedColorId}
              onSizeChange={setSelectedSizeId}
              sizeLabels={sizeLabels}
              materialLabel={materialLabel}
              badgeLabel={undefined}
            />

            <ProductHighlights specifications={highlightSpecs} />
            <ProductSpecsGrid specifications={gridSpecs} />
            <ProductInfoAccordions
              description={hasMeaningfulText(product.description) ? product.description : undefined}
              returnPolicy={returnPolicy}
            />
          </motion.div>
        </div>

        <ProductTrustBadges />
        <ProductReviewsSection productId={product.id} />

        <div className="mt-12 space-y-8">
          <ProductCategoryLinks product={product} />
        </div>
      </Container>

      <RecentlyViewedSection productIds={recentlyViewedIds} excludeProductId={product.id} />
      <RelatedProducts productId={product.id} />

      <BackToTop />

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
    </>
  );
}
