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
import {
  buildProductDisplaySpecs,
  partitionProductSpecs,
  hasMeaningfulText,
} from '@/utils/catalog/specifications';
import { resolveProductGalleryMedia } from '@/utils/catalog/resolve-gallery-media';
import type { ProductVariant } from '@/services/sdk';

function resolveBadgeLabel(product: {
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
}): string | undefined {
  if (product.tags?.some((t) => /design of the week/i.test(t))) return 'Design of the Week';
  if (product.isFeatured) return 'Design of the Week';
  if (product.isBestSeller) return 'Best Seller';
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
    // materialId is set but facets haven't loaded yet — don't guess from specs
    if (materials.length === 0) return undefined;
  }
  const spec = (specifications ?? []).find((s) => {
    if (!s || typeof s !== 'object') return false;
    const r = s as Record<string, unknown>;
    const label = String(r.label ?? r.key ?? r.name ?? '')
      .trim()
      .toLowerCase();
    // Exact Material only — never treat "Fabric care" as Material
    return label === 'material' || label === 'fabric' || label === 'fabrics';
  }) as Record<string, unknown> | undefined;
  if (spec?.value) return String(spec.value);
  return undefined;
}

function resolveCareLabel(specifications?: unknown[]): string | undefined {
  const specs = (specifications ?? []).filter((s): s is Record<string, unknown> =>
    Boolean(s && typeof s === 'object'),
  );
  const preferred = specs.find((r) => {
    const label = String(r.label ?? r.key ?? r.name ?? '')
      .trim()
      .toLowerCase();
    return (
      label === 'fabric care' ||
      label === 'wash care' ||
      label === 'care' ||
      label === 'material & care'
    );
  });
  if (preferred?.value) return String(preferred.value);
  return undefined;
}

export function ProductDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const query = useProductDetail(slug);
  const product = query.data;
  const { recentlyViewedIds } = useRecentlyViewed(product);
  const { sizes, materials, colors, occasions } = useCatalogFilterFacets();
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

  const colorLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const facet of colors.data?.data ?? []) {
      map[facet.id] = facet.name;
    }
    return map;
  }, [colors.data?.data]);

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

  const occasionLabel = useMemo(() => {
    const id = product?.occasionIds?.[0];
    if (!id) return undefined;
    return occasions.data?.data?.find((item) => item.id === id)?.name;
  }, [occasions.data?.data, product?.occasionIds]);

  const allMedia = useMemo(() => {
    if (!product) return [];
    if (product.media?.length) return product.media;
    if (product.thumbnailUrl) {
      return [{ id: 'primary', url: product.thumbnailUrl, alt: product.name, isPrimary: true }];
    }
    return [];
  }, [product]);

  const galleryMedia = useMemo(
    () => resolveProductGalleryMedia(allMedia, product?.variants, selectedColorId),
    [allMedia, product?.variants, selectedColorId],
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

  const price =
    selectedVariant?.salePrice ?? selectedVariant?.price ?? product.salePrice ?? product.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const rawSpecs = Array.isArray(product.specifications) ? product.specifications : [];
  const materialLabel = resolveMaterialLabel(product.materialId, materialList, rawSpecs);
  const colorLabel =
    (selectedColorId && colorLabels[selectedColorId]) ||
    (selectedVariant?.colorId && colorLabels[selectedVariant.colorId]) ||
    undefined;
  const careLabel = resolveCareLabel(rawSpecs);

  const displaySpecs = buildProductDisplaySpecs({
    specifications: rawSpecs,
    gender: product.gender,
    ageGroup: product.ageGroup,
    materialLabel,
    occasionLabel,
    brandName: product.brandName,
    colorLabel,
    careLabel,
  });
  const { gridSpecs, returnPolicy, highlightSpecs } = partitionProductSpecs(displaySpecs);
  const badgeLabel = resolveBadgeLabel(product);

  return (
    <>
      <Seo
        title={product.seo?.title ? String(product.seo.title) : product.name}
        description={
          product.seo?.description
            ? String(product.seo.description)
            : (product.shortDescription ?? product.description)
        }
        image={galleryMedia[0]?.url ?? allMedia[0]?.url}
        url={buildAbsoluteUrl(`/products/${product.slug}`)}
        siteName={siteConfig.name}
        type="product"
        jsonLd={buildProductJsonLd({
          name: product.name,
          description: product.shortDescription ?? product.description,
          images: (galleryMedia.length ? galleryMedia : allMedia).map((item) => item.url),
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

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          <ProductGallery
            key={`${selectedColorId ?? 'all'}-${galleryMedia.map((m) => m.id).join('-')}`}
            media={galleryMedia}
            productName={product.name}
            badgeLabel={badgeLabel}
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 lg:sticky lg:top-24 lg:self-start"
          >
            <ProductPurchasePanel
              product={product}
              media={allMedia}
              selectedVariantId={selectedVariantId}
              selectedColorId={selectedColorId}
              selectedSizeId={selectedSizeId}
              onVariantChange={setSelectedVariantId}
              onColorChange={setSelectedColorId}
              onSizeChange={setSelectedSizeId}
              sizeLabels={sizeLabels}
              colorLabels={colorLabels}
              materialLabel={materialLabel}
              badgeLabel={badgeLabel}
            />

            <div className="border-border bg-card/70 space-y-6 rounded-none border border-dashed p-5 sm:p-6">
              <ProductHighlights specifications={highlightSpecs} />
              <ProductSpecsGrid specifications={gridSpecs} />
              <ProductInfoAccordions
                description={
                  hasMeaningfulText(product.description) ? product.description : undefined
                }
                returnPolicy={
                  product.returnsAvailable
                    ? product.returnsCriteria ||
                      returnPolicy ||
                      'Easy returns & instant refunds on eligible items.'
                    : 'Returns are not available for this product.'
                }
                warrantyDetails={
                  product.warrantyAvailable
                    ? product.warrantyDetails || 'Manufacturer warranty included.'
                    : undefined
                }
              />
            </div>
          </motion.div>
        </div>

        <ProductTrustBadges
          paymentOption={product.paymentOption}
          returnsAvailable={product.returnsAvailable}
          returnsCriteria={product.returnsCriteria}
          warrantyAvailable={product.warrantyAvailable}
          warrantyDetails={product.warrantyDetails}
        />
        <ProductReviewsSection productId={product.id} />

        <div className="mt-12 space-y-8">
          <ProductCategoryLinks product={product} />
        </div>
      </Container>

      <RecentlyViewedSection productIds={recentlyViewedIds} excludeProductId={product.id} />
      <RelatedProducts productId={product.id} />

      <BackToTop />

      <div className="border-border/70 bg-background/95 fixed inset-x-3 bottom-[5.25rem] z-40 rounded-none border p-3 shadow-[var(--shadow-elevated)] backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold uppercase tracking-wide">{product.name}</p>
            <PriceDisplay
              premium
              size="sm"
              price={selectedVariant?.price ?? product.price}
              salePrice={selectedVariant?.salePrice ?? product.salePrice ?? product.effectivePrice}
              compareAtPrice={compareAt}
            />
          </div>
          <AddToCartButton
            product={product}
            variantId={selectedVariantId}
            size="sm"
            label="Add"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none"
          />
        </div>
      </div>
    </>
  );
}
