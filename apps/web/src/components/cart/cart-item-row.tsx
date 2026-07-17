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
import { cn } from '@/lib/utils';

export interface CartItemRowProps {
  item: CartLineItem;
  compact?: boolean;
  validationMessage?: string;
  className?: string;
}

export function CartItemRow({ item, compact, validationMessage, className }: CartItemRowProps) {
  const updateMutation = useUpdateCartItemMutation();
  const removeMutation = useRemoveCartItemMutation();

  const displayPrice = item.salePrice ?? item.unitPrice;
  const currency = item.currency ?? 'LKR';

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
        className="bg-muted block shrink-0 overflow-hidden rounded-lg"
        aria-label={`View ${item.name}`}
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          aspectRatio="1/1"
          className={cn(compact ? 'size-16' : 'size-24 sm:size-28')}
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium leading-snug">
              <Link
                to="/products/$slug"
                params={{ slug: String(item.productSlug ?? item.productId) }}
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
            onClick={() => removeMutation.mutate(item.id)}
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

        {validationMessage ? (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{validationMessage}</AlertDescription>
          </Alert>
        ) : null}

        {!item.inStock || item.stockStatus === 'out_of_stock' ? (
          <p className="text-destructive text-xs font-medium">Out of stock</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuantitySelector
            value={item.quantity}
            onChange={(quantity) =>
              updateMutation.mutate({ itemId: item.id, payload: { quantity } })
            }
            loading={updateMutation.isPending}
            disabled={item.id.startsWith('optimistic-')}
          />

          <div className="text-right">
            <p className="text-sm font-medium">{formatCurrency(item.totalPrice, currency)}</p>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(displayPrice, currency)} each
            </p>
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
