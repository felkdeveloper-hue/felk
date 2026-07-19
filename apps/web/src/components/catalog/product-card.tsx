import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { PriceDisplay } from './price-display';
import { QuickViewModal } from './quick-view-modal';

export interface ProductCardProps {
  product: Product;
  className?: string;
  layout?: 'grid' | 'list';
}

export function ProductCard({ product, className, layout = 'grid' }: ProductCardProps) {
  const candidates = [
    product.thumbnailUrl,
    product.media?.find((item) => item.isPrimary)?.url,
    product.media?.[0]?.url,
    product.hoverImageUrl,
    product.media?.[1]?.url,
  ].filter((url): url is string => Boolean(url));

  const [primaryBroken, setPrimaryBroken] = useState(false);
  const primaryImage = primaryBroken ? (candidates[1] ?? candidates[0]) : candidates[0];
  const hoverImage = candidates.find((url) => url && url !== primaryImage) ?? product.hoverImageUrl;
  const isList = layout === 'list';
  const [quickOpen, setQuickOpen] = useState(false);
  const [hoverReady, setHoverReady] = useState(false);

  return (
    <>
      <motion.article
        layout
        className={cn('group relative', isList && 'flex gap-4', className)}
        whileHover={{ y: isList ? 0 : -6 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            'bg-muted relative overflow-hidden rounded-[1.35rem]',
            isList ? 'w-36 shrink-0 sm:w-48' : 'w-full',
          )}
        >
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            preload="intent"
            aria-label={`View ${product.name}`}
            className="block"
          >
            <Image
              key={primaryImage}
              src={primaryImage}
              alt={product.media?.[0]?.alt ?? product.name}
              aspectRatio="3/4"
              className={cn(
                'transition-all duration-700 ease-out group-hover:scale-[1.06]',
                hoverImage && hoverReady ? 'group-hover:opacity-0' : undefined,
              )}
              onError={() => setPrimaryBroken(true)}
            />
            {hoverImage && hoverImage !== primaryImage ? (
              <Image
                src={hoverImage}
                alt=""
                aspectRatio="3/4"
                containerClassName={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-out',
                  hoverReady
                    ? 'opacity-0 group-hover:opacity-100'
                    : 'opacity-0 pointer-events-none',
                )}
                className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                aria-hidden
                onLoad={() => setHoverReady(true)}
              />
            ) : null}
          </Link>

          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {product.isNewArrival ? (
              <Badge className="bg-foreground text-background rounded-full px-2.5">New</Badge>
            ) : null}
            {product.isOnSale || product.isClearance ? (
              <Badge className="bg-accent text-accent-foreground rounded-full px-2.5">
                {product.discountPercent ? `-${Math.round(product.discountPercent)}%` : 'Sale'}
              </Badge>
            ) : null}
            {product.status === 'out_of_stock' ? (
              <Badge variant="outline" className="bg-card/90 rounded-full">
                Sold out
              </Badge>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <WishlistButton
              product={product}
              className="bg-card/95 rounded-full shadow-[var(--shadow-soft)] backdrop-blur"
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={`Quick view ${product.name}`}
              className="bg-card/95 rounded-full shadow-[var(--shadow-soft)] backdrop-blur"
              onClick={() => setQuickOpen(true)}
            >
              <Eye />
            </Button>
          </div>

          <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:pointer-events-auto max-sm:translate-y-0 max-sm:opacity-100">
            <AddToCartButton
              product={product}
              size="sm"
              className="w-full rounded-full shadow-[var(--shadow-elevated)]"
            />
          </div>
        </div>

        <div
          className={cn('space-y-1.5 pt-3', isList && 'flex flex-1 flex-col justify-center py-1')}
        >
          {product.brandName ? (
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em]">
              {product.brandName}
            </p>
          ) : null}
          <h3 className="text-foreground text-sm font-semibold leading-snug sm:text-[15px]">
            <Link
              to="/products/$slug"
              params={{ slug: product.slug }}
              preload="intent"
              className="hover:underline"
            >
              {product.name}
            </Link>
          </h3>
          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice ?? product.effectivePrice}
            compareAtPrice={product.compareAtPrice}
          />
        </div>
      </motion.article>

      <QuickViewModal product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
