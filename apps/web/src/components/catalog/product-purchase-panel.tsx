import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Info, ShoppingBag } from 'lucide-react';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/utils';
import { ROUTES } from '@/constants';
import type { Product, ProductMoney, ProductVariant } from '@/services/sdk';
import { cn } from '@/lib/utils';
import { PriceDisplay } from './price-display';
import { ProductRatingBadge } from './product-rating-badge';
import { ProductSizeSelector } from './product-size-selector';
import { ProductOffersSection } from './product-offers-section';
import { ProductDeliveryCheck } from './product-delivery-check';
import { VariantSelector } from './variant-selector';

function resolveDealPrice(product: Product): ProductMoney | undefined {
  const display = product.salePrice ?? product.effectivePrice ?? product.price;
  const deal = product.effectivePrice;
  if (!display || !deal) return undefined;
  if (deal.amount > 0 && deal.amount < display.amount) return deal;
  return undefined;
}

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

export interface ProductPurchasePanelProps {
  product: Product;
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
  const variants = product.variants ?? [];

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );

  const isInCart = useMemo(
    () =>
      Boolean(
        selectedVariantId && cart?.items?.some((item) => item.variantId === selectedVariantId),
      ),
    [cart?.items, selectedVariantId],
  );

  const dealPrice = resolveDealPrice(product);
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;

  const colors = [...new Set(variants.map((v) => v.colorId).filter(Boolean))] as string[];
  const hasSeparateSizeSelector = variants.some((v) => v.sizeId);

  const handleColorSelect = (colorId: string) => {
    onColorChange(colorId);
    const match = findVariant(variants, colorId, selectedSizeId);
    if (match) onVariantChange(match.id);
  };

  const handleSizeSelect = (sizeId: string) => {
    onSizeChange(sizeId);
    const match = findVariant(variants, selectedColorId, sizeId);
    if (match) onVariantChange(match.id);
  };

  return (
    <div className="space-y-5">
      {badgeLabel ? (
        <span className="text-foreground inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {badgeLabel}
        </span>
      ) : null}

      {product.brandName ? (
        <p className="text-foreground text-xs font-bold uppercase tracking-wide">
          {product.brandName}
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-muted-foreground text-lg font-normal leading-snug sm:text-xl">
          {product.name}
        </h1>
        <ProductRatingBadge
          averageRating={product.averageRating}
          reviewCount={product.reviewCount}
          className="shrink-0"
        />
      </div>

      <div className="space-y-1">
        <PriceDisplay
          size="md"
          price={selectedVariant?.price ?? product.price}
          salePrice={selectedVariant?.salePrice ?? product.salePrice ?? product.effectivePrice}
          compareAtPrice={compareAt}
          discountPercent={product.discountPercent}
        />
        <p className="text-muted-foreground text-xs">Inclusive of all taxes</p>
      </div>

      {dealPrice ? (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-300/60 bg-violet-50/50 px-3 py-1.5 text-sm text-violet-900">
          <Info className="size-3.5 shrink-0" />
          Get it for as low as {formatCurrency(dealPrice.amount, dealPrice.currency)}
        </div>
      ) : null}

      {materialLabel ? (
        <span className="bg-muted text-muted-foreground inline-block rounded-md px-2.5 py-1 text-xs font-medium">
          {materialLabel}
        </span>
      ) : null}

      {colors.length > 1 ? (
        <VariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          onSelect={(id) => {
            const variant = variants.find((v) => v.id === id);
            if (variant?.colorId) handleColorSelect(variant.colorId);
            else onVariantChange(id);
          }}
          colorLabels={colorLabels}
          showColors
          showSizes={false}
        />
      ) : null}

      {hasSeparateSizeSelector ? (
        <ProductSizeSelector
          variants={variants}
          selectedColorId={selectedColorId}
          selectedSizeId={selectedSizeId}
          onSizeSelect={handleSizeSelect}
          sizeLabels={sizeLabels}
        />
      ) : null}

      {!hasSeparateSizeSelector && colors.length <= 1 && variants.length ? (
        <VariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          onSelect={onVariantChange}
          colorLabels={colorLabels}
          sizeLabels={sizeLabels}
        />
      ) : null}

      <div className="flex gap-3 pt-1">
        {isInCart ? (
          <Link
            to={ROUTES.cart}
            className={cn(
              'text-foreground inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-amber-400/90',
            )}
          >
            <ShoppingBag className="size-4" />
            Go to bag
          </Link>
        ) : (
          <AddToCartButton
            product={product}
            variantId={selectedVariantId}
            size="lg"
            className="text-foreground min-h-12 flex-1 rounded-xl bg-amber-400 font-bold uppercase tracking-wide hover:bg-amber-400/90"
            label="Add to bag"
          />
        )}
        <WishlistButton
          product={product}
          variantId={selectedVariantId}
          iconOnly
          variant="outline"
          size="lg"
          className="min-h-12 min-w-12 rounded-xl"
        />
      </div>

      <ProductOffersSection />
      <ProductDeliveryCheck />
    </div>
  );
}
