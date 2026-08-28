import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Minus, Plus, RefreshCcw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { useBuyNowMutation } from '@/hooks/cart';
import { useCartStore } from '@/store/cart-store';
import { resolveVariantId } from '@/utils/cart';
import { formatCurrency } from '@/utils';
import { ROUTES } from '@/constants';
import type { Product, ProductMedia, ProductMoney, ProductVariant } from '@/services/sdk';
import { AppError } from '@/lib/errors';
import { productMetaFrom, trackCommerceEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { PriceDisplay } from './price-display';
import { ProductColorSelector } from './product-color-selector';
import { ProductRatingSummary } from './product-rating-summary';
import { ProductSizeSelector, isSizeOutOfStock } from './product-size-selector';
import { VariantSelector } from './variant-selector';
import { DeliveryTrustCue } from './delivery-trust-cue';
import { getSeededReviewSummary } from '@/lib/seeded-reviews';
import { isProductLowStock, isProductSoldOut } from '@/utils/catalog/stock';

function resolveDealPrice(product: Product): ProductMoney | undefined {
  const display = product.salePrice ?? product.effectivePrice ?? product.price;
  const deal = product.effectivePrice;
  if (!display || !deal) return undefined;
  if (deal.amount > 0 && deal.amount < display.amount) return deal;
  return undefined;
}

/** Auto-generated "Color / Size" labels shouldn't override the product title. */
function isAutoColorSizeLabel(title: string): boolean {
  return /^[^/]+ \/ [^/]+$/.test(title) && title.length <= 48;
}

/**
 * When the selected color is surfaced as its own listing, show that color's custom
 * title (e.g. "Women's Sky Blue …") instead of the parent product name.
 */
function resolveColorDisplayName(
  variants: ProductVariant[],
  colorId: string | undefined,
  fallback: string,
): string {
  if (!colorId) return fallback;
  const colorVariants = variants.filter((v) => v.colorId === colorId);
  const titles = colorVariants
    .map((v) => v.title?.trim())
    .filter((title): title is string => Boolean(title));
  if (!titles.length) return fallback;
  const descriptive = titles.filter((title) => !isAutoColorSizeLabel(title));
  // A descriptive per-color title is intentional admin content. Use it even
  // if an older API response omitted the listSeparately flag.
  return [...descriptive].sort((a, b) => b.length - a.length)[0] ?? fallback;
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
  if (sizeId)
    return (
      variants.find((v) => v.sizeId === sizeId && !v.colorId) ??
      variants.find((v) => v.sizeId === sizeId)
    );
  return variants[0];
}

/** True when the size exists for the selected color (or there is no color constraint). */
function sizeAvailableForColor(
  variants: ProductVariant[],
  colorId: string | undefined,
  sizeId: string | undefined,
): boolean {
  if (!sizeId) return false;
  if (!colorId) return variants.some((v) => v.sizeId === sizeId);
  return variants.some((v) => v.colorId === colorId && v.sizeId === sizeId);
}

export interface ProductPurchasePanelProps {
  product: Product;
  media?: ProductMedia[];
  selectedVariantId?: string;
  selectedColorId?: string;
  selectedSizeId?: string;
  onVariantChange: (variantId: string) => void;
  onColorChange: (colorId: string) => void;
  onSizeChange: (sizeId: string) => void;
  sizeLabels?: Record<string, string>;
  colorLabels?: Record<string, string>;
  materialLabel?: string;
  badgeLabel?: string;
}

export function ProductPurchasePanel({
  product,
  media = [],
  selectedVariantId,
  selectedColorId,
  selectedSizeId,
  onVariantChange,
  onColorChange,
  onSizeChange,
  sizeLabels = {},
  colorLabels = {},
  materialLabel,
  badgeLabel,
}: ProductPurchasePanelProps) {
  const cart = useCartStore((state) => state.cart);
  const buyNowMutation = useBuyNowMutation();
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const variants = product.variants ?? [];

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );

  const dealPrice = resolveDealPrice(product);
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const displayName = resolveColorDisplayName(variants, selectedColorId, product.name);
  const liveSalePrice =
    (selectedVariant?.salePrice && selectedVariant.salePrice.amount > 0
      ? selectedVariant.salePrice
      : undefined) ??
    (product.salePrice && product.salePrice.amount > 0 ? product.salePrice : undefined);
  const livePrice =
    (selectedVariant?.price && selectedVariant.price.amount > 0
      ? selectedVariant.price
      : undefined) ?? product.price;

  const colors = [...new Set(variants.map((v) => v.colorId).filter(Boolean))] as string[];
  const hasSeparateSizeSelector = variants.some((v) => v.sizeId);
  const hasColorSelector = colors.length > 0;
  const sizeMatchesColor = sizeAvailableForColor(variants, selectedColorId, selectedSizeId);
  const effectiveSizeId = sizeMatchesColor ? selectedSizeId : undefined;
  const resolvedForSelection = findVariant(variants, selectedColorId, effectiveSizeId);
  const cartVariantId = resolvedForSelection?.id ?? selectedVariantId;
  const selectionReady =
    !hasSeparateSizeSelector || Boolean(effectiveSizeId && resolvedForSelection);
  const colorHasNoSizes =
    hasSeparateSizeSelector &&
    Boolean(selectedColorId) &&
    !variants.some((v) => v.colorId === selectedColorId && v.sizeId);
  const selectedSizeOutOfStock =
    Boolean(effectiveSizeId) &&
    isSizeOutOfStock(variants, effectiveSizeId as string, selectedColorId);
  const selectedVariantOutOfStock = (() => {
    const target = resolvedForSelection ?? selectedVariant;
    if (!target) return product.inStock === false || product.status === 'out_of_stock';
    if (target.status === 'out_of_stock') return true;
    if (typeof target.stock === 'number') return target.stock <= 0;
    return false;
  })();
  const isSelectionOutOfStock =
    colorHasNoSizes ||
    (hasSeparateSizeSelector ? selectedSizeOutOfStock : selectedVariantOutOfStock);
  const productOutOfStock = isProductSoldOut(product);
  const showLowStock = isProductLowStock(product);

  const seeded = getSeededReviewSummary(product.id, product.name, product.slug);
  const ratingAverage =
    product.averageRating && product.averageRating > 0 && (product.reviewCount ?? 0) >= 5
      ? product.averageRating
      : seeded.average;
  const ratingCount =
    product.reviewCount && product.reviewCount >= 5 ? product.reviewCount : seeded.total;

  const isInCart = useMemo(
    () => Boolean(cartVariantId && cart?.items?.some((item) => item.variantId === cartVariantId)),
    [cart?.items, cartVariantId],
  );

  const availabilityChips: { label: string }[] = [];
  if (product.warrantyAvailable) availabilityChips.push({ label: 'Warranty available' });
  if (product.returnsAvailable)
    availabilityChips.push({ label: 'Exchanges available (customer-paid)' });

  const handleColorSelect = (colorId: string) => {
    const normalized = colorId || undefined;
    onColorChange(normalized ?? '');
    setSizeError(false);

    if (!normalized) {
      const uncolored =
        variants.find((v) => !v.colorId && v.isDefault) ??
        variants.find((v) => !v.colorId && v.id === product.defaultVariantId) ??
        variants.find((v) => !v.colorId);
      if (uncolored) onVariantChange(uncolored.id);
      if (selectedSizeId && !sizeAvailableForColor(variants, undefined, selectedSizeId)) {
        onSizeChange('');
      }
      return;
    }

    const matchWithSize = selectedSizeId
      ? findVariant(variants, normalized, selectedSizeId)
      : undefined;

    if (matchWithSize) {
      onVariantChange(matchWithSize.id);
      return;
    }

    // Previous size isn't sold in this color — clear it so we never add the old color's SKU.
    onSizeChange('');
    const colorFirst = findVariant(variants, normalized);
    if (colorFirst) onVariantChange(colorFirst.id);
    if (selectedSizeId) {
      toast.message('Select a size for this color');
    }
  };

  const handleSizeSelect = (sizeId: string) => {
    onSizeChange(sizeId);
    setSizeError(false);
    const match = findVariant(variants, selectedColorId, sizeId);
    if (match) onVariantChange(match.id);
  };

  const handleBuyNow = () => {
    if (hasSeparateSizeSelector && !effectiveSizeId) {
      setSizeError(true);
      toast.error(
        selectedSizeId && !sizeMatchesColor
          ? 'This size is not available in the selected color'
          : 'Please select a size to continue',
      );
      return;
    }
    if (isSelectionOutOfStock) {
      toast.error('This size is out of stock');
      return;
    }
    const resolved = resolvedForSelection?.id ?? resolveVariantId(selectedVariantId, product);
    if (!resolved) {
      toast.error('Please select an available option');
      return;
    }
    // Never checkout a SKU that doesn't match the visible color/size.
    if (
      selectedColorId &&
      !variants.some((v) => v.id === resolved && v.colorId === selectedColorId)
    ) {
      toast.error('Please select a size for this color');
      setSizeError(true);
      return;
    }
    buyNowMutation.mutate(
      { variantId: resolved, quantity },
      {
        onSuccess: () => {
          trackCommerceEvent(
            'buy_now_clicked',
            productMetaFrom(product, { variantId: resolved, quantity }),
          );
        },
        onError: (error) => {
          toast.error(AppError.isAppError(error) ? error.message : 'Unable to start checkout');
        },
      },
    );
  };

  return (
    <div
      className={cn(
        // Mobile: dense Bonkers-like rhythm (no desktop card chrome)
        'text-card-foreground space-y-4 bg-transparent p-0',
        // Desktop: keep existing premium card
        'lg:border-border lg:bg-card lg:relative lg:space-y-6 lg:rounded-none lg:border lg:p-7 lg:shadow-[0_1px_0_hsl(var(--foreground)/0.04),0_18px_40px_-28px_hsl(var(--foreground)/0.35)]',
        'lg:before:bg-foreground lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-0.5',
      )}
    >
      <div className="space-y-2 lg:space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {badgeLabel ? (
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.22em] lg:text-[11px] lg:tracking-[0.18em]">
              {badgeLabel}
            </span>
          ) : null}
          {product.brandName ? (
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em] lg:text-xs lg:tracking-[0.16em]">
              {product.brandName}
            </p>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-foreground text-[1.35rem] font-semibold uppercase leading-[1.15] tracking-[-0.02em] lg:text-2xl lg:font-bold lg:tracking-[0.04em]">
            {displayName}
          </h1>
          <WishlistButton
            product={product}
            variantId={selectedVariantId}
            iconOnly
            variant="ghost"
            size="icon"
            className="text-foreground lg:text-muted-foreground lg:hover:text-foreground -mr-1.5 mt-0 size-11 shrink-0 hover:bg-transparent lg:mt-0.5 lg:size-10"
          />
        </div>

        <ProductRatingSummary average={ratingAverage} count={ratingCount} />

        {showLowStock ? (
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-red-600">
            Low in Stock
          </p>
        ) : null}

        <div className="space-y-1">
          <PriceDisplay
            premium
            size="md"
            price={livePrice}
            salePrice={liveSalePrice}
            compareAtPrice={compareAt}
            discountPercent={product.isOnSale ? product.discountPercent : undefined}
            className="[&_span.font-bold]:text-xl lg:[&_span.font-bold]:text-2xl [&_span]:tracking-tight"
          />
          <p className="text-muted-foreground text-[11px] tracking-wide lg:text-xs">
            Inclusive of all taxes
          </p>
          {!productOutOfStock ? <DeliveryTrustCue className="pt-1" /> : null}
        </div>

        {dealPrice ? (
          <p className="text-muted-foreground text-sm">
            Extra deals from {formatCurrency(dealPrice.amount, dealPrice.currency)}
          </p>
        ) : null}

        {materialLabel ? (
          <span className="text-muted-foreground lg:bg-muted inline-block text-[11px] font-medium uppercase tracking-[0.16em] lg:rounded-none lg:px-2.5 lg:py-1 lg:text-xs lg:tracking-wide">
            {materialLabel}
          </span>
        ) : null}
      </div>

      {availabilityChips.length ? (
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
          {availabilityChips.map((chip) => {
            const isWarranty = /warranty/i.test(chip.label);
            const Icon = isWarranty ? ShieldCheck : RefreshCcw;
            return (
              <span
                key={chip.label}
                className="text-foreground/80 inline-flex items-center gap-2 text-[12px] font-medium tracking-wide lg:rounded-none lg:border lg:border-emerald-500/30 lg:bg-emerald-50 lg:px-2.5 lg:py-1.5 lg:text-xs lg:font-semibold lg:text-emerald-900 dark:lg:border-emerald-500/35 dark:lg:bg-emerald-950/40 dark:lg:text-emerald-100"
              >
                <Icon className="size-3.5 shrink-0 opacity-70 lg:opacity-100" aria-hidden />
                {chip.label}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="border-border/60 space-y-4 border-t pt-4 lg:space-y-0 lg:border-0 lg:pt-0">
        {/* Color first, then sizes for that color only */}
        {hasColorSelector ? (
          <ProductColorSelector
            variants={variants}
            media={media}
            selectedColorId={selectedColorId}
            onColorSelect={handleColorSelect}
            colorLabels={colorLabels}
            productName={product.name}
            fallbackImageUrl={product.thumbnailUrl}
          />
        ) : null}

        {hasSeparateSizeSelector ? (
          <div
            data-size-selector
            className={sizeError ? 'rounded-none p-3 ring-2 ring-red-500' : undefined}
          >
            {sizeError ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                {selectedSizeId && !sizeMatchesColor
                  ? 'This size is not available in the selected color'
                  : 'Please select a size'}
              </p>
            ) : null}
            <ProductSizeSelector
              variants={variants}
              selectedColorId={selectedColorId}
              selectedSizeId={effectiveSizeId}
              onSizeSelect={handleSizeSelect}
              sizeLabels={sizeLabels}
            />
          </div>
        ) : null}

        {!hasSeparateSizeSelector && !hasColorSelector && variants.length > 1 ? (
          <VariantSelector
            variants={variants}
            selectedId={selectedVariantId}
            onSelect={onVariantChange}
            colorLabels={colorLabels}
            sizeLabels={sizeLabels}
          />
        ) : null}
      </div>

      <div className="border-border/60 space-y-2.5 border-t pt-4 lg:space-y-3 lg:border-0 lg:pt-1">
        <div className="flex items-stretch gap-2.5 lg:gap-3">
          <div className="border-border inline-flex h-12 items-center rounded-none border lg:h-12">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="text-foreground active:bg-muted lg:hover:bg-muted flex h-full w-11 items-center justify-center transition-colors disabled:opacity-40"
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
              className="text-foreground active:bg-muted lg:hover:bg-muted flex h-full w-11 items-center justify-center transition-colors"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {isInCart ? (
            <Link
              to={ROUTES.cart}
              className={cn(
                'border-foreground text-foreground lg:hover:bg-foreground lg:hover:text-background inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-none border bg-transparent px-4 text-[11px] font-bold uppercase tracking-[0.16em] transition-opacity active:opacity-80 lg:px-6 lg:text-sm lg:tracking-[0.12em]',
              )}
            >
              <ShoppingBag className="size-4" />
              Go to bag
            </Link>
          ) : productOutOfStock || colorHasNoSizes || (isSelectionOutOfStock && selectionReady) ? (
            <button
              type="button"
              disabled
              className="border-border text-muted-foreground bg-muted/40 h-12 min-w-0 flex-1 cursor-not-allowed rounded-none border text-[11px] font-bold uppercase tracking-[0.16em] lg:text-sm lg:tracking-[0.12em]"
            >
              Out of stock
            </button>
          ) : !selectionReady ? (
            <button
              type="button"
              onClick={() => {
                setSizeError(true);
                toast.error(
                  selectedSizeId && !sizeMatchesColor
                    ? 'This size is not available in the selected color'
                    : 'Please select a size to continue',
                );
              }}
              className="border-foreground text-foreground lg:hover:bg-foreground lg:hover:text-background h-12 min-w-0 flex-1 rounded-none border bg-transparent text-[11px] font-bold uppercase tracking-[0.16em] transition-opacity active:opacity-80 lg:text-sm lg:tracking-[0.12em]"
            >
              Add to cart
            </button>
          ) : (
            <AddToCartButton
              product={product}
              variantId={cartVariantId}
              quantity={quantity}
              size="lg"
              variant="outline"
              skipOptionGate
              className="border-foreground text-foreground lg:hover:bg-foreground lg:hover:text-background h-12 min-w-0 flex-1 rounded-none border bg-transparent text-[11px] font-bold uppercase tracking-[0.16em] lg:text-sm lg:tracking-[0.12em]"
              label="Add to cart"
            />
          )}
        </div>

        {!productOutOfStock && !colorHasNoSizes && !(isSelectionOutOfStock && selectionReady) ? (
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={buyNowMutation.isPending || isSelectionOutOfStock}
            className="bg-foreground text-background lg:hover:bg-foreground/90 inline-flex h-12 w-full items-center justify-center rounded-none text-[11px] font-bold uppercase tracking-[0.18em] transition-opacity active:opacity-85 disabled:opacity-50 lg:text-sm lg:tracking-[0.14em]"
          >
            {buyNowMutation.isPending ? 'Please wait…' : 'Buy it now'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
