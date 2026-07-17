import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { PriceDisplay } from './price-display';

export interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Premium quick-view dialog — presentation only; uses list product payload. */
export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
  if (!product) return null;

  const image = product.thumbnailUrl ?? product.media?.[0]?.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[1.75rem] p-0 sm:max-w-3xl">
        <div className="grid sm:grid-cols-2">
          <div className="bg-muted relative overflow-hidden">
            <Image
              src={image}
              alt={product.name}
              aspectRatio="3/4"
              className="h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <DialogHeader className="space-y-3 text-left">
              {product.brandName ? (
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {product.brandName}
                </p>
              ) : null}
              <DialogTitle className="font-display text-3xl leading-none tracking-tight">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {product.shortDescription ??
                  'Discover fit, fabric, and finish details on the full product page.'}
              </DialogDescription>
            </DialogHeader>

            <PriceDisplay
              price={product.price}
              salePrice={product.salePrice ?? product.effectivePrice}
              compareAtPrice={product.compareAtPrice}
            />

            <div className="flex flex-wrap gap-2">
              {product.isNewArrival ? (
                <Badge className="bg-foreground text-background rounded-full">New</Badge>
              ) : null}
              {product.isOnSale || product.isClearance ? (
                <Badge className="bg-accent text-accent-foreground rounded-full">Sale</Badge>
              ) : null}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <AddToCartButton product={product} size="lg" className="w-full" />
              <div className="grid grid-cols-2 gap-3">
                <WishlistButton product={product} iconOnly={false} variant="outline" size="lg" />
                <Button asChild variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                  <Link to="/products/$slug" params={{ slug: product.slug }}>
                    Details
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
