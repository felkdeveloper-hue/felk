import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { AlertTriangle, Bookmark, Trash2 } from 'lucide-react';
import { useRemoveCartItemMutation, useUpdateCartItemMutation } from '@/hooks/cart';
import type { CartLineItem } from '@/services/sdk';
import { formatCurrency } from '@/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import { QuantitySelector } from '@/components/cart/quantity-selector';
import { productMetaFrom, trackCommerceEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { useFlashSale } from '@/contexts/flash-sale-context';

function lineMeta(item: CartLineItem) {
  return productMetaFrom(
    {
      id: item.productId,
      name: item.name,
      sku: item.sku,
      price: item.salePrice ?? item.unitPrice,
      currency: item.currency,
    },
    {
      variantId: item.variantId,
      variantLabel: [item.colorName, item.sizeName].filter(Boolean).join(' / ') || null,
      quantity: item.quantity,
    },
  );
}

export interface CartItemRowProps {
  item: CartLineItem;
  compact?: boolean;
  validationMessage?: string;
  className?: string;
}

export function CartItemRow({ item, compact, validationMessage, className }: CartItemRowProps) {
  const updateMutation = useUpdateCartItemMutation();
  const removeMutation = useRemoveCartItemMutation();
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { isFlashSaleActive } = useFlashSale();

  const displayPrice = item.salePrice ?? item.unitPrice;
  const currency = item.currency ?? 'LKR';

  // Flash sale: 20% off for logged-in users with active sale only
  const flashUnitPrice = isAuthed && isFlashSaleActive ? Math.round(displayPrice * 0.8) : null;
  const flashTotalPrice = flashUnitPrice !== null ? flashUnitPrice * item.quantity : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('border-border flex gap-4 border-b py-4 last:border-b-0', className)}
    >
      <Link
        to="/products/$slug"
        params={{ slug: String(item.productSlug ?? item.productId) }}
        search={{ variant: undefined }}
        className={cn(
          'bg-muted block shrink-0 overflow-hidden rounded-lg',
          compact ? 'size-16' : 'size-24 sm:size-28',
        )}
        aria-label={`View ${item.name}`}
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          aspectRatio="1/1"
          containerClassName="size-full"
          className="size-full object-cover"
          loading="eager"
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium leading-snug">
              <Link
                to="/products/$slug"
                params={{ slug: String(item.productSlug ?? item.productId) }}
                search={{ variant: undefined }}
                className="hover:underline"
              >
                {item.name}
              </Link>
            </h3>
            {!compact ? (
              <div className="text-muted-foreground space-y-0.5 text-xs">
                {item.colorName ? <p>Color: {item.colorName}</p> : null}
                {item.sizeName ? <p>Size: {item.sizeName}</p> : null}
                {item.sku ? <p>SKU: {item.sku}</p> : null}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${item.name} from cart`}
            onClick={() =>
              removeMutation.mutate(item.id, {
                onSuccess: () => trackCommerceEvent('remove_from_cart', lineMeta(item)),
              })
            }
            loading={removeMutation.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {item.priceChanged ? (
          <Alert variant="warning" className="py-2">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription className="text-xs">
              Price updated since added
              {item.priceDifference
                ? ` (${item.priceDifference > 0 ? '+' : ''}${formatCurrency(item.priceDifference, currency)})`
                : ''}
              .
            </AlertDescription>
          </Alert>
        ) : null}

        {(() => {
          const outOfStock = item.inStock === false || item.stockStatus === 'out_of_stock';
          const lowStock =
            !outOfStock &&
            typeof item.availableQuantity === 'number' &&
            item.availableQuantity > 0 &&
            item.availableQuantity < item.quantity;
          const stockMessage =
            validationMessage ??
            (outOfStock
              ? 'Out of stock — remove this item to continue checkout'
              : lowStock
                ? `Only ${item.availableQuantity} left — reduce quantity or remove this item`
                : null);

          return stockMessage ? (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertDescription className="text-xs font-medium">{stockMessage}</AlertDescription>
            </Alert>
          ) : null;
        })()}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuantitySelector
            value={item.quantity}
            min={0}
            max={
              typeof item.availableQuantity === 'number' && item.availableQuantity > 0
                ? item.availableQuantity
                : undefined
            }
            onChange={(quantity) => {
              if (quantity === 0) {
                removeMutation.mutate(item.id, {
                  onSuccess: () => trackCommerceEvent('remove_from_cart', lineMeta(item)),
                });
              } else {
                const increased = quantity > item.quantity;
                updateMutation.mutate(
                  { itemId: item.id, payload: { quantity } },
                  {
                    onSuccess: () =>
                      trackCommerceEvent(increased ? 'quantity_increased' : 'quantity_decreased', {
                        ...lineMeta(item),
                        quantity,
                      }),
                  },
                );
              }
            }}
            loading={updateMutation.isPending || removeMutation.isPending}
            disabled={
              item.id.startsWith('optimistic-') ||
              item.inStock === false ||
              item.stockStatus === 'out_of_stock'
            }
          />

          <div className="text-right">
            {flashTotalPrice !== null ? (
              <>
                <p className="text-muted-foreground text-xs line-through">
                  {formatCurrency(item.totalPrice, currency)}
                </p>
                <p className="text-sm font-bold" style={{ color: '#f97316' }}>
                  {formatCurrency(flashTotalPrice, currency)}
                </p>
                <p className="text-muted-foreground text-xs">
                  <span className="line-through">{formatCurrency(displayPrice, currency)}</span>{' '}
                  <span style={{ color: '#f97316' }}>
                    {formatCurrency(flashUnitPrice!, currency)}
                  </span>{' '}
                  each
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">{formatCurrency(item.totalPrice, currency)}</p>
                <p className="text-muted-foreground text-xs">
                  {formatCurrency(displayPrice, currency)} each
                </p>
              </>
            )}
          </div>
        </div>

        {!compact ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled>
            <Bookmark className="size-3.5" aria-hidden />
            Save for later (coming soon)
          </Button>
        ) : null}
      </div>
    </motion.article>
  );
}
