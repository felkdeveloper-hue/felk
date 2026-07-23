import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Eye, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, ProductMoney } from '@/services/sdk';
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
  /** Eager-load primary image for LCP cards above the fold. */
  priority?: boolean;
  sizes?: string;
}

function readAverageRating(product: Product): number | undefined {
  const raw = product.averageRating ?? product.rating;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 10) / 10;
}

function resolveDealPrice(product: Product): ProductMoney | undefined {
  const display = product.salePrice ?? product.effectivePrice ?? product.price;
  const deal = product.effectivePrice;
  if (!display || !deal) return undefined;
  if (deal.amount > 0 && deal.amount < display.amount) return deal;
  return undefined;
}

export function ProductCard({
  product,
  className,
  layout = 'grid',
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: ProductCardProps) {
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
  /** Only mount hover image after first hover/focus — halves image requests on load. */
  const [wantHover, setWantHover] = useState(false);

  const averageRating = readAverageRating(product);
  const title = product.name;
  // Compute discount % for image badge
  const displayPrice = product.salePrice ?? product.effectivePrice ?? product.price;
  const originalPrice = product.salePrice ? product.price : product.compareAtPrice;
  const discountPct =
    displayPrice && originalPrice && originalPrice.amount > displayPrice.amount
      ? Math.round(((originalPrice.amount - displayPrice.amount) / originalPrice.amount) * 100)
      : typeof product.discountPercent === 'number' && product.discountPercent > 0
        ? Math.round(product.discountPercent)
        : null;

  return (
    <>
      <motion.article
        layout
        className={cn('group relative', isList && 'flex gap-4', className)}
        whileHover={{ y: isList ? 0 : -4 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setWantHover(true)}
        onFocusCapture={() => setWantHover(true)}
      >
        <div
          className={cn(
            'bg-muted relative overflow-hidden',
            isList ? 'w-36 shrink-0 rounded-xl sm:w-48' : 'w-full',
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
              sizes={sizes}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className={cn(
                'transition-all duration-700 ease-out group-hover:scale-[1.06]',
                hoverImage && hoverReady ? 'group-hover:opacity-0' : undefined,
              )}
              onError={() => setPrimaryBroken(true)}
            />
            {wantHover && hoverImage && hoverImage !== primaryImage ? (
              <Image
                src={hoverImage}
                alt=""
                aspectRatio="3/4"
                sizes={sizes}
                loading="lazy"
                containerClassName={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-out',
                  hoverReady
                    ? 'opacity-0 group-hover:opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
                className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                aria-hidden
                onLoad={() => setHoverReady(true)}
              />
            ) : null}
          </Link>

          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {discountPct ? (
              <Badge className="rounded-none bg-red-600 px-2 text-[10px] font-bold uppercase tracking-wide text-white">
                Save {discountPct}%
              </Badge>
            ) : null}
            {product.status === 'out_of_stock' ? (
              <Badge variant="outline" className="bg-card/90 rounded-none text-[10px]">
                Sold out
              </Badge>
            ) : null}
          </div>

          <div className="absolute right-2.5 top-2.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={`Quick view ${product.name}`}
              className="bg-card/95 size-8 rounded-full shadow-[var(--shadow-soft)] backdrop-blur"
              onClick={() => setQuickOpen(true)}
            >
              <Eye className="size-3.5" />
            </Button>
          </div>

          {averageRating != null ? (
            <div
              className="bg-card absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 shadow-[var(--shadow-soft)] transition-opacity group-hover:opacity-0"
              aria-label={`Rated ${averageRating} out of 5`}
            >
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-foreground text-[11px] font-bold leading-none">
                {averageRating.toFixed(1)}
              </span>
            </div>
          ) : null}

          {/* Bonkers-style add to cart bar — grid cards */}
          {!isList ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:pointer-events-auto max-sm:translate-y-0 max-sm:opacity-100">
              <AddToCartButton
                product={product}
                label="Add to cart"
                className="h-11 w-full rounded-none border-0 bg-zinc-950 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-none hover:bg-zinc-900 hover:text-white"
              />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-1 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:pointer-events-auto max-sm:translate-y-0 max-sm:opacity-100">
              <AddToCartButton
                product={product}
                size="sm"
                className="w-full rounded-full shadow-[var(--shadow-elevated)]"
              />
            </div>
          )}
        </div>

        <div className={cn('pt-2', isList && 'flex flex-1 flex-col justify-center py-1')}>
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-foreground line-clamp-1 text-sm font-medium leading-snug">
              <Link
                to="/products/$slug"
                params={{ slug: product.slug }}
                preload="intent"
                className="hover:underline"
              >
                {title}
              </Link>
            </h3>
            <WishlistButton
              product={product}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground -mr-1.5 -mt-0.5 size-7 shrink-0 rounded-full"
            />
          </div>

          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice ?? product.effectivePrice}
            compareAtPrice={product.compareAtPrice}
            discountPercent={product.discountPercent}
          />
        </div>
      </motion.article>

      <QuickViewModal product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
