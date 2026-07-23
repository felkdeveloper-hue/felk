import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { useAddToCartMutation } from '@/hooks/cart';
import { useCatalogFilterFacets, useProductById } from '@/hooks/catalog';
import { ROUTES } from '@/constants';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { resolveVariantId } from '@/utils/cart';
import { needsOptionSelection } from '@/utils/catalog/needs-option-selection';
import { resolveProductGalleryMedia } from '@/utils/catalog/resolve-gallery-media';
import type { Product, ProductVariant } from '@/services/sdk';
import { PriceDisplay } from './price-display';
import { ProductColorSelector } from './product-color-selector';
import { ProductOffersSection } from './product-offers-section';
import { ProductSizeSelector } from './product-size-selector';
import { VariantSelector } from './variant-selector';

function findVariant(
  variants: ProductVariant[],
  colorId?: string,
  sizeId?: string,
): ProductVariant | undefined {
  if (colorId && sizeId) {
    return variants.find((v) => v.colorId === colorId && v.sizeId === sizeId);
  }
  if (sizeId) return variants.find((v) => v.sizeId === sizeId);
  if (colorId) return variants.find((v) => v.colorId === colorId);
  return variants[0];
}

export interface SelectOptionsSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelectOptionsSheet({ product, open, onOpenChange }: SelectOptionsSheetProps) {
  const navigate = useNavigate();
  const addMutation = useAddToCartMutation();
  const detailQuery = useProductById(open ? product.id : '');
  const { sizes, colors } = useCatalogFilterFacets();

  const detail = detailQuery.data ?? product;
  const variants = detail.variants ?? [];

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
  const sizeReady = !hasSeparateSizeSelector || Boolean(selectedSizeId);
  const canAdd = sizeReady && Boolean(resolveVariantId(selectedVariantId, detail));

  const handleColorSelect = (colorId: string) => {
    setSelectedColorId(colorId);
    const match = findVariant(variants, colorId, selectedSizeId);
    if (match) setSelectedVariantId(match.id);
  };

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSizeId(sizeId);
    setSizePromptVisible(false);
    const match = findVariant(variants, selectedColorId, sizeId);
    if (match) setSelectedVariantId(match.id);
  };

  const handleBlockedAdd = () => {
    if (hasSeparateSizeSelector && !selectedSizeId) {
      setSizePromptVisible(true);
      toast.error('Please select a size');
    }
  };

  const handleBuyNow = () => {
    if (hasSeparateSizeSelector && !selectedSizeId) {
      setSizePromptVisible(true);
      toast.error('Please select a size');
      return;
    }
    const resolved = resolveVariantId(selectedVariantId, detail);
    if (!resolved) {
      toast.error('Please select an available option');
      return;
    }
    addMutation.mutate(
      { variantId: resolved, quantity },
      {
        onSuccess: () => {
          onOpenChange(false);
          void navigate({ to: ROUTES.checkout });
        },
        onError: (error) => {
          toast.error(AppError.isAppError(error) ? error.message : 'Unable to start checkout');
        },
      },
    );
  };

  const loading = open && detailQuery.isLoading && !detail.variants?.length;
  const stillNeedsOptions = needsOptionSelection(detail);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="w-full gap-0 overflow-y-auto p-0 sm:!max-w-3xl lg:!max-w-4xl"
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
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
              <div className="bg-muted aspect-3/4 w-full animate-pulse" />
              <div className="space-y-4">
                <div className="bg-muted h-7 w-3/4 animate-pulse" />
                <div className="bg-muted h-6 w-1/2 animate-pulse" />
                <div className="bg-muted h-24 w-full animate-pulse" />
              </div>
            </div>
          ) : (
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

                {hasSeparateSizeSelector && sizePromptVisible && !selectedSizeId ? (
                  <p
                    role="status"
                    className="border-foreground/20 bg-muted text-foreground border px-3 py-2.5 text-sm font-semibold"
                  >
                    Please select a size
                  </p>
                ) : null}

                {stillNeedsOptions ? (
                  <>
                    {hasSeparateSizeSelector ? (
                      <ProductSizeSelector
                        variants={variants}
                        selectedColorId={selectedColorId}
                        selectedSizeId={selectedSizeId}
                        onSizeSelect={handleSizeSelect}
                        sizeLabels={sizeLabels}
                      />
                    ) : null}

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
                        variantId={selectedVariantId}
                        quantity={quantity}
                        size="lg"
                        variant="outline"
                        className="border-foreground text-foreground hover:bg-foreground hover:text-background h-12 min-w-0 flex-1 rounded-none border bg-transparent font-bold uppercase tracking-[0.12em]"
                        label="Add to cart"
                        onAdded={() => onOpenChange(false)}
                        skipOptionGate
                      />
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

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={addMutation.isPending || detail.status === 'out_of_stock'}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 w-full items-center justify-center rounded-none text-sm font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
                  >
                    {addMutation.isPending ? 'Please wait…' : 'Buy it now'}
                  </button>
                </div>

                <ProductOffersSection />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
