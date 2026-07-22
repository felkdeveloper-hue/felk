import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Minus, Plus, RefreshCcw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { useAddToCartMutation } from '@/hooks/cart';
import { useCartStore } from '@/store/cart-store';
import { resolveVariantId } from '@/utils/cart';
import { formatCurrency } from '@/utils';
import { ROUTES } from '@/constants';
import type { Product, ProductMedia, ProductMoney, ProductVariant } from '@/services/sdk';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { PriceDisplay } from './price-display';
import { ProductColorSelector } from './product-color-selector';
import { ProductDeliveryCheck } from './product-delivery-check';
import { ProductOffersSection } from './product-offers-section';
import { ProductSizeSelector } from './product-size-selector';
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
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const addMutation = useAddToCartMutation();
  const [quantity, setQuantity] = useState(1);
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
  const hasColorSelector = colors.length > 0;

  const availabilityChips: { label: string }[] = [];
  if (product.warrantyAvailable) availabilityChips.push({ label: 'Warranty available' });
  if (product.returnsAvailable) availabilityChips.push({ label: 'Returns & refunds available' });

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

  const handleBuyNow = () => {
    const resolved = resolveVariantId(selectedVariantId, product);
    if (!resolved) {
      toast.error('Please select an available option');
      return;
    }
    addMutation.mutate(
      { variantId: resolved, quantity },
      {
        onSuccess: () => {
          void navigate({ to: ROUTES.checkout });
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
        'border-border bg-card text-card-foreground space-y-6 rounded-none border p-5 shadow-[0_1px_0_hsl(var(--foreground)/0.04),0_18px_40px_-28px_hsl(var(--foreground)/0.35)] sm:p-7',
        'before:bg-foreground relative before:absolute before:inset-y-0 before:left-0 before:w-0.5',
      )}
    >
      <div className="space-y-3">
        {badgeLabel ? (
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em]">
            {badgeLabel}
          </span>
        ) : null}

        {product.brandName ? (
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
            {product.brandName}
          </p>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-foreground text-xl font-bold uppercase leading-tight tracking-[0.04em] sm:text-2xl">
            {product.name}
          </h1>
          <WishlistButton
            product={product}
            variantId={selectedVariantId}
            iconOnly
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground -mr-1 mt-0.5 size-10 shrink-0"
          />
        </div>

        <div className="space-y-1.5">
          <PriceDisplay
            premium
            size="md"
            price={selectedVariant?.price ?? product.price}
            salePrice={selectedVariant?.salePrice ?? product.salePrice ?? product.effectivePrice}
            compareAtPrice={compareAt}
            discountPercent={product.discountPercent}
          />
          <p className="text-muted-foreground text-xs">Inclusive of all taxes</p>
        </div>

        {dealPrice ? (
          <p className="text-muted-foreground text-sm">
            Extra deals from {formatCurrency(dealPrice.amount, dealPrice.currency)}
          </p>
        ) : null}

        {materialLabel ? (
          <span className="bg-muted text-muted-foreground inline-block rounded-none px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
            {materialLabel}
          </span>
        ) : null}
      </div>

      {availabilityChips.length ? (
        <div className="flex flex-wrap gap-2">
          {availabilityChips.map((chip) => {
            const isWarranty = /warranty/i.test(chip.label);
            const Icon = isWarranty ? ShieldCheck : RefreshCcw;
            return (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {chip.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Size + color must sit above the cart CTAs */}
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
          media={media}
          selectedColorId={selectedColorId}
          onColorSelect={handleColorSelect}
          colorLabels={colorLabels}
          productName={product.name}
        />
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

      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-stretch gap-3">
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

          {isInCart ? (
            <Link
              to={ROUTES.cart}
              className={cn(
                'border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-none border bg-transparent px-6 text-sm font-bold uppercase tracking-[0.12em] transition-colors',
              )}
            >
              <ShoppingBag className="size-4" />
              Go to bag
            </Link>
          ) : (
            <AddToCartButton
              product={product}
              variantId={selectedVariantId}
              quantity={quantity}
              size="lg"
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background h-12 min-w-0 flex-1 rounded-none border bg-transparent font-bold uppercase tracking-[0.12em]"
              label="Add to cart"
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={addMutation.isPending || product.status === 'out_of_stock'}
          className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 w-full items-center justify-center rounded-none text-sm font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
        >
          {addMutation.isPending ? 'Please wait…' : 'Buy it now'}
        </button>
      </div>

      <ProductOffersSection />
      <ProductDeliveryCheck paymentOption={product.paymentOption} />
    </div>
  );
}
