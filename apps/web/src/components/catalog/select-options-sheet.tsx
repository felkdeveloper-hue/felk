import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { Image } from '@/components/media/image';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useBuyNowMutation } from '@/hooks/cart';
import { useCatalogFilterFacets, useProductById } from '@/hooks/catalog';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { resolveVariantId } from '@/utils/cart';
import { needsOptionSelection } from '@/utils/catalog/needs-option-selection';
import { resolveProductGalleryMedia } from '@/utils/catalog/resolve-gallery-media';
import type { Product, ProductVariant } from '@/services/sdk';
import { PriceDisplay } from './price-display';
import { ProductColorSelector } from './product-color-selector';
import { ProductOffersSection } from './product-offers-section';
import { ProductSizeSelector, isSizeOutOfStock } from './product-size-selector';
import { VariantSelector } from './variant-selector';

function useIsMobileSheet(breakpoint = 1024) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpoint]);
  return mobile;
}

function findVariant(
  variants: ProductVariant[],
  colorId?: string,
  sizeId?: string,
): ProductVariant | undefined {
  if (colorId && sizeId) {
    return variants.find((v) => v.colorId === colorId && v.sizeId === sizeId);
  }
  if (colorId && !sizeId) {
    return (
      variants.find((v) => v.colorId === colorId && v.isDefault) ??
      variants.find((v) => v.colorId === colorId)
    );
  }
  if (sizeId) {
    return (
      variants.find((v) => v.sizeId === sizeId && !v.colorId) ??
      variants.find((v) => v.sizeId === sizeId)
    );
  }
  return variants[0];
}

function sizeAvailableForColor(
  variants: ProductVariant[],
  colorId: string | undefined,
  sizeId: string | undefined,
): boolean {
  if (!sizeId) return false;
  if (!colorId) return variants.some((v) => v.sizeId === sizeId);
  return variants.some((v) => v.colorId === colorId && v.sizeId === sizeId);
}

export interface SelectOptionsSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelectOptionsSheet({ product, open, onOpenChange }: SelectOptionsSheetProps) {
  const buyNowMutation = useBuyNowMutation();
  const detailQuery = useProductById(open ? product.id : '', { initialProduct: product });
  // Facets can load in the background — sheet should not wait on them.
  const { sizes, colors } = useCatalogFilterFacets({ enabled: open });
  const isMobile = useIsMobileSheet();

  const detail = detailQuery.data ?? product;
  const variants = detail.variants ?? product.variants ?? [];

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [selectedColorId, setSelectedColorId] = useState<string | undefined>();
  const [selectedSizeId, setSelectedSizeId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [activeImageUrl, setActiveImageUrl] = useState<string | undefined>();
  const [sizePromptVisible, setSizePromptVisible] = useState(true);

  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setSizePromptVisible(true);
    setSelectedSizeId(undefined);
    setSelectedVariantId(undefined);
  }, [open, product.id]);

  useEffect(() => {
    if (!open || !variants.length) return;
    const defaultVariant = variants.find((v) => v.id === detail.defaultVariantId) ?? variants[0];
    if (!defaultVariant) return;
    // Pre-select color for gallery only — size must be chosen by the shopper.
    setSelectedColorId(defaultVariant.colorId);
    if (!variants.some((v) => v.sizeId)) {
      setSelectedVariantId(defaultVariant.id);
    }
  }, [open, detail.defaultVariantId, variants]);

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

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );

  const gallery = useMemo(() => {
    const media = detail.media ?? [];
    const fromGallery = resolveProductGalleryMedia(media, variants, selectedColorId);
    if (fromGallery.length) return fromGallery;

    const fallbackUrl =
      selectedVariant?.thumbnailUrl ??
      detail.thumbnailUrl ??
      product.thumbnailUrl ??
      product.media?.[0]?.url;

    return fallbackUrl
      ? [{ id: 'fallback', url: fallbackUrl, isPrimary: true, alt: detail.name }]
      : [];
  }, [
    detail.media,
    detail.name,
    detail.thumbnailUrl,
    product.media,
    product.thumbnailUrl,
    selectedColorId,
    selectedVariant?.thumbnailUrl,
    variants,
  ]);

  useEffect(() => {
    setActiveImageUrl(gallery[0]?.url);
  }, [gallery]);

  const previewUrl = activeImageUrl ?? gallery[0]?.url;

  const colorIds = [...new Set(variants.map((v) => v.colorId).filter(Boolean))] as string[];
  const hasSeparateSizeSelector = variants.some((v) => v.sizeId);
  const hasColorSelector = colorIds.length > 0;
  const sizeMatchesColor = sizeAvailableForColor(variants, selectedColorId, selectedSizeId);
  const effectiveSizeId = sizeMatchesColor ? selectedSizeId : undefined;
  const resolvedForSelection = findVariant(variants, selectedColorId, effectiveSizeId);
  const sizeReady = !hasSeparateSizeSelector || Boolean(effectiveSizeId && resolvedForSelection);
  const cartVariantId = resolvedForSelection?.id ?? selectedVariantId;
  const selectedSizeOutOfStock =
    Boolean(effectiveSizeId) &&
    isSizeOutOfStock(variants, effectiveSizeId as string, selectedColorId);
  const selectedVariantOutOfStock = (() => {
    const target = resolvedForSelection ?? selectedVariant;
    if (!target) return detail.inStock === false || detail.status === 'out_of_stock';
    if (target.status === 'out_of_stock') return true;
    if (typeof target.stock === 'number') return target.stock <= 0;
    return false;
  })();
  const isSelectionOutOfStock = hasSeparateSizeSelector
    ? selectedSizeOutOfStock
    : selectedVariantOutOfStock;
  const canAdd =
    sizeReady && !isSelectionOutOfStock && Boolean(resolveVariantId(cartVariantId, detail));

  const handleColorSelect = (colorId: string) => {
    setSelectedColorId(colorId || undefined);
    const matchWithSize = selectedSizeId
      ? findVariant(variants, colorId, selectedSizeId)
      : undefined;
    if (matchWithSize) {
      setSelectedVariantId(matchWithSize.id);
      return;
    }
    setSelectedSizeId(undefined);
    setSizePromptVisible(true);
    const colorFirst = findVariant(variants, colorId);
    if (colorFirst) setSelectedVariantId(colorFirst.id);
  };

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSizeId(sizeId);
    setSizePromptVisible(false);
    const match = findVariant(variants, selectedColorId, sizeId);
    if (match) setSelectedVariantId(match.id);
  };

  const handleBlockedAdd = () => {
    if (hasSeparateSizeSelector && !effectiveSizeId) {
      setSizePromptVisible(true);
      toast.error(
        selectedSizeId && !sizeMatchesColor
          ? 'This size is not available in the selected color'
          : 'Please select a size',
      );
    }
  };

  const handleBuyNow = () => {
    if (hasSeparateSizeSelector && !effectiveSizeId) {
      setSizePromptVisible(true);
      toast.error(
        selectedSizeId && !sizeMatchesColor
          ? 'This size is not available in the selected color'
          : 'Please select a size',
      );
      return;
    }
    if (isSelectionOutOfStock) {
      toast.error('This size is out of stock');
      return;
    }
    const resolved = resolvedForSelection?.id ?? resolveVariantId(selectedVariantId, detail);
    if (!resolved) {
      toast.error('Please select an available option');
      return;
    }
    if (
      selectedColorId &&
      !variants.some((v) => v.id === resolved && v.colorId === selectedColorId)
    ) {
      toast.error('Please select a size for this color');
      return;
    }
    onOpenChange(false);
    buyNowMutation.mutate(
      { variantId: resolved, quantity },
      {
        onError: (error) => {
          toast.error(AppError.isAppError(error) ? error.message : 'Unable to start checkout');
        },
      },
    );
  };

  const stillNeedsOptions = needsOptionSelection(detail);
  void detailQuery.isFetching;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        showClose={false}
        overlayClassName="z-[100]"
        className={cn(
          'z-[100] w-full gap-0 overflow-y-auto p-0 sm:!max-w-3xl lg:!max-w-4xl',
          isMobile &&
            'h-[min(92dvh,920px)] max-h-[92dvh] !max-w-none rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]',
        )}
        aria-describedby={undefined}
      >
        <SheetHeader className="border-border bg-card sticky top-0 z-20 flex flex-row items-center justify-between gap-4 border-b px-5 py-3.5">
          <div className="min-w-0 space-y-0">
            <SheetTitle className="font-display text-base font-bold uppercase tracking-[0.14em]">
              Select options
            </SheetTitle>
            <SheetDescription className="sr-only">
              Choose size, color, and quantity before adding {product.name} to your bag.
            </SheetDescription>
          </div>
          <SheetClose
            aria-label="Close"
            className="border-border text-foreground hover:bg-muted focus-visible:ring-ring/40 flex size-10 shrink-0 items-center justify-center border bg-transparent outline-none transition-colors focus-visible:ring-[3px]"
          >
            <X className="size-5" strokeWidth={2.5} />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="grid items-start gap-6 md:grid-cols-2 md:gap-8">
            {/* Left — product photos */}
            <div className="space-y-3 md:sticky md:top-20">
              {previewUrl ? (
                <div className="bg-muted overflow-hidden">
                  <Image
                    key={previewUrl}
                    src={previewUrl}
                    alt={detail.name}
                    aspectRatio="3/4"
                    className="w-full object-cover"
                  />
                </div>
              ) : (
                <div className="bg-muted aspect-3/4 w-full" />
              )}
              {gallery.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((item) => {
                    const active = item.url === previewUrl;
                    return (
                      <button
                        key={item.id ?? item.url}
                        type="button"
                        aria-label="View product photo"
                        aria-pressed={active}
                        onClick={() => setActiveImageUrl(item.url)}
                        className={cn(
                          'bg-muted relative w-14 shrink-0 overflow-hidden border sm:w-16',
                          active ? 'border-foreground border-2' : 'border-border',
                        )}
                      >
                        <Image src={item.url} alt="" aspectRatio="3/4" className="object-cover" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Right — size, color, cart actions */}
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-foreground text-lg font-bold uppercase leading-tight tracking-[0.04em] sm:text-xl">
                    {detail.name}
                  </h2>
                  <WishlistButton
                    product={detail}
                    variantId={selectedVariantId}
                    iconOnly
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground -mr-1 mt-0.5 size-9 shrink-0"
                  />
                </div>

                <PriceDisplay
                  premium
                  size="md"
                  price={selectedVariant?.price ?? detail.price}
                  salePrice={
                    selectedVariant?.salePrice ?? detail.salePrice ?? detail.effectivePrice
                  }
                  compareAtPrice={selectedVariant?.compareAtPrice ?? detail.compareAtPrice}
                  discountPercent={detail.discountPercent}
                />
                <p className="text-muted-foreground text-xs">Shipping calculated at checkout.</p>
              </div>

              {hasSeparateSizeSelector && sizePromptVisible && !effectiveSizeId ? (
                <p
                  role="status"
                  className="border-foreground/20 bg-muted text-foreground border px-3 py-2.5 text-sm font-semibold"
                >
                  Please select a size
                </p>
              ) : null}

              {stillNeedsOptions ? (
                <>
                  {hasColorSelector ? (
                    <ProductColorSelector
                      variants={variants}
                      media={detail.media}
                      selectedColorId={selectedColorId}
                      onColorSelect={handleColorSelect}
                      colorLabels={colorLabels}
                      productName={detail.name}
                      fallbackImageUrl={detail.thumbnailUrl ?? product.thumbnailUrl}
                    />
                  ) : null}

                  {hasSeparateSizeSelector ? (
                    <ProductSizeSelector
                      variants={variants}
                      selectedColorId={selectedColorId}
                      selectedSizeId={effectiveSizeId}
                      onSizeSelect={handleSizeSelect}
                      sizeLabels={sizeLabels}
                    />
                  ) : null}

                  {!hasSeparateSizeSelector && !hasColorSelector && variants.length > 1 ? (
                    <VariantSelector
                      variants={variants}
                      selectedId={selectedVariantId}
                      onSelect={setSelectedVariantId}
                      colorLabels={colorLabels}
                      sizeLabels={sizeLabels}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This product has a single option — add it to your bag below.
                </p>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex items-stretch gap-3">
                  <div className="border-border inline-flex h-12 items-center rounded-none border">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="text-foreground hover:bg-muted flex h-full w-11 items-center justify-center transition-colors disabled:opacity-40"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="text-foreground hover:bg-muted flex h-full w-11 items-center justify-center transition-colors"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {canAdd ? (
                    <AddToCartButton
                      product={detail}
                      variantId={cartVariantId}
                      quantity={quantity}
                      size="lg"
                      variant="outline"
                      className="border-foreground text-foreground hover:bg-foreground hover:text-background h-12 min-w-0 flex-1 rounded-none border bg-transparent font-bold uppercase tracking-[0.12em]"
                      label="Add to cart"
                      onAdded={() => onOpenChange(false)}
                      skipOptionGate
                    />
                  ) : isSelectionOutOfStock && sizeReady ? (
                    <button
                      type="button"
                      disabled
                      className="border-border text-muted-foreground bg-muted/40 h-12 min-w-0 flex-1 cursor-not-allowed border text-sm font-bold uppercase tracking-[0.12em]"
                    >
                      Out of stock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBlockedAdd}
                      className="border-foreground text-foreground hover:bg-muted h-12 min-w-0 flex-1 border bg-transparent text-sm font-bold uppercase tracking-[0.12em]"
                    >
                      Add to cart
                    </button>
                  )}
                </div>

                {!isSelectionOutOfStock || !sizeReady ? (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={
                      buyNowMutation.isPending ||
                      detail.inStock === false ||
                      detail.status === 'out_of_stock' ||
                      isSelectionOutOfStock
                    }
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 w-full items-center justify-center rounded-none text-sm font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
                  >
                    {buyNowMutation.isPending ? 'Please wait…' : 'Buy it now'}
                  </button>
                ) : null}
              </div>

              <ProductOffersSection />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
