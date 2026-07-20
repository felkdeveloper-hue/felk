import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Eye, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, ProductMoney } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { PriceDisplay } from './price-display';
import { QuickViewModal } from './quick-view-modal';

export interface ProductCardProps {
  product: Product;
  className?: string;
  layout?: 'grid' | 'list';
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

  const averageRating = readAverageRating(product);
  const title = product.brandName ?? product.name;
  const subtitle = product.brandName ? product.name : (product.shortDescription ?? undefined);
  const dealPrice = resolveDealPrice(product);
  const showPromo =
    dealPrice != null || Boolean(product.isOnSale && (product.salePrice ?? product.effectivePrice));
  const promoPrice = dealPrice ?? product.salePrice ?? product.effectivePrice ?? product.price;

  return (
    <>
      <motion.article
        layout
        className={cn('group relative', isList && 'flex gap-4', className)}
        whileHover={{ y: isList ? 0 : -4 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            'bg-muted relative overflow-hidden rounded-t-2xl',
            isList ? 'w-36 shrink-0 rounded-2xl sm:w-48' : 'w-full',
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
                    : 'pointer-events-none opacity-0',
                )}
                className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                aria-hidden
                onLoad={() => setHoverReady(true)}
              />
            ) : null}
          </Link>

          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {product.isNewArrival ? (
              <Badge className="bg-foreground text-background rounded-md px-2 text-[10px]">
                New
              </Badge>
            ) : null}
            {product.status === 'out_of_stock' ? (
              <Badge variant="outline" className="bg-card/90 rounded-md text-[10px]">
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
              className="bg-card absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 shadow-[var(--shadow-soft)]"
              aria-label={`Rated ${averageRating} out of 5`}
            >
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-foreground text-[11px] font-bold leading-none">
                {averageRating.toFixed(1)}
              </span>
            </div>
          ) : null}

          {isList ? (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-1 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:pointer-events-auto max-sm:translate-y-0 max-sm:opacity-100">
              <AddToCartButton
                product={product}
                size="sm"
                className="w-full rounded-full shadow-[var(--shadow-elevated)]"
              />
            </div>
          ) : null}
        </div>

        <div
          className={cn('space-y-1.5 pt-2.5', isList && 'flex flex-1 flex-col justify-center py-1')}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-foreground line-clamp-1 text-sm font-bold leading-snug">
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
              className="text-muted-foreground hover:text-foreground -mr-1.5 -mt-1 size-8 shrink-0 rounded-full"
            />
          </div>

          {subtitle ? (
            <p className="text-muted-foreground line-clamp-1 text-xs leading-snug sm:text-[13px]">
              {subtitle}
            </p>
          ) : null}

          <PriceDisplay
            price={product.price}
            salePrice={product.salePrice ?? product.effectivePrice}
            compareAtPrice={product.compareAtPrice}
            discountPercent={product.discountPercent}
          />

          {showPromo && promoPrice ? (
            <div className="border-primary/15 bg-primary/5 text-primary inline-flex max-w-full rounded-md border px-2 py-1 text-[11px] font-medium leading-tight">
              <span className="truncate">
                Get it for as low as {formatCurrency(promoPrice.amount, promoPrice.currency)}
              </span>
            </div>
          ) : null}
        </div>
      </motion.article>

      <QuickViewModal product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
