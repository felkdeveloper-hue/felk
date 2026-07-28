import { memo, useCallback, useRef, useState, type TouchEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, Heart, Plus, Star } from 'lucide-react';
import type { Product } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { SelectOptionsSheet } from '@/components/catalog/select-options-sheet';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import {
  useAddToWishlistMutation,
  useDefaultWishlistQuery,
  useIsInWishlist,
  useRemoveFromWishlistMutation,
} from '@/hooks/wishlist';
import { useAuthStore } from '@/store';
import { useUiStore } from '@/store/ui-store';
import { ROUTES } from '@/constants';
import { resolveVariantId } from '@/utils/cart';
import { needsOptionSelection } from '@/utils/catalog/needs-option-selection';
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

function ProductCardComponent({
  product,
  className,
  layout = 'grid',
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: ProductCardProps) {
  const navigate = useNavigate();
  const listingVariant = product.variants?.find(
    (variant) => variant.id === product.defaultVariantId,
  );
  const listingVariantIds = new Set(
    product.variants
      ?.filter(
        (variant) =>
          variant.id === product.defaultVariantId ||
          (listingVariant?.colorId && variant.colorId === listingVariant.colorId),
      )
      .map((variant) => variant.id) ?? [],
  );
  const productLevelMedia = product.media?.filter((item) => !item.variantId) ?? [];
  const listingMedia =
    product.defaultVariantId && listingVariantIds.size
      ? (product.media?.filter((item) => item.variantId && listingVariantIds.has(item.variantId)) ??
        [])
      : [];
  const cardMedia = product.defaultVariantId ? listingMedia : productLevelMedia;
  const candidates = [
    product.thumbnailUrl,
    product.hoverImageUrl,
    cardMedia.find((item) => item.isPrimary)?.url,
    cardMedia[0]?.url,
    cardMedia[1]?.url,
    ...cardMedia.slice(2, 5).map((item) => item.url),
  ].filter((url): url is string => Boolean(url));

  const [primaryBroken, setPrimaryBroken] = useState(false);
  const uniqueCandidates = [...new Set(candidates)];
  // Mobile: single image only — horizontal swipe must scroll the product rail, not cycle photos.
  const primaryImage = primaryBroken
    ? (uniqueCandidates[1] ?? uniqueCandidates[0])
    : uniqueCandidates[0];
  const hoverImage =
    uniqueCandidates.find((url) => url && url !== uniqueCandidates[0]) ?? product.hoverImageUrl;
  const isList = layout === 'list';
  const [quickOpen, setQuickOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [hoverReady, setHoverReady] = useState(false);
  const [wantHover, setWantHover] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const lastTap = useRef(0);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const didSwipe = useRef(false);

  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const resolvedVariantId = resolveVariantId(undefined, product);
  const isInWishlist = useIsInWishlist(product.id, resolvedVariantId);
  const wishlistQuery = useDefaultWishlistQuery();
  const addWishlist = useAddToWishlistMutation();
  const removeWishlist = useRemoveFromWishlistMutation();
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);

  const averageRating = readAverageRating(product);
  const title = product.name;
  const liveSale =
    product.salePrice && product.salePrice.amount > 0 ? product.salePrice : undefined;
  const displayPrice = liveSale ?? product.effectivePrice ?? product.price;
  const originalPrice = liveSale ? product.price : product.compareAtPrice;
  const discountPct =
    displayPrice &&
    displayPrice.amount > 0 &&
    originalPrice &&
    originalPrice.amount > displayPrice.amount
      ? Math.round(((originalPrice.amount - displayPrice.amount) / originalPrice.amount) * 100)
      : product.isOnSale &&
          typeof product.discountPercent === 'number' &&
          product.discountPercent > 0 &&
          product.discountPercent < 100
        ? Math.round(product.discountPercent)
        : null;

  const productHref = {
    to: '/products/$slug' as const,
    params: { slug: product.slug },
    search: {
      variant: product.defaultVariantId ? String(product.defaultVariantId) : undefined,
      color: product.colorId,
    },
  };

  const toggleWishlist = useCallback(() => {
    if (!isAuthed) {
      void navigate({ to: ROUTES.authLogin, search: { redirect: window.location.pathname } });
      return;
    }
    const wishlistId = wishlistQuery.data?.id;
    if (!wishlistId) return;

    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 220);

    if (isInWishlist) {
      const item = wishlistQuery.data?.items.find(
        (entry) =>
          entry.productId === product.id &&
          (resolvedVariantId ? entry.variantId === resolvedVariantId : true),
      );
      if (!item) return;
      removeWishlist.mutate(
        { wishlistId, itemId: item.id },
        { onSuccess: () => setCartAnnouncement(`${product.name} removed from wishlist`) },
      );
      return;
    }

    addWishlist.mutate(
      { productId: product.id, variantId: resolvedVariantId, wishlistId },
      { onSuccess: () => setCartAnnouncement(`${product.name} added to wishlist`) },
    );
  }, [
    addWishlist,
    isAuthed,
    isInWishlist,
    navigate,
    product.id,
    product.name,
    removeWishlist,
    resolvedVariantId,
    setCartAnnouncement,
    wishlistQuery.data?.id,
    wishlistQuery.data?.items,
  ]);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    longPressFired.current = false;
    didSwipe.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setQuickOpen(true);
    }, 480);
  };

  const onTouchMove = (event: TouchEvent) => {
    const start = touchStartX.current;
    const x = event.touches[0]?.clientX;
    if (start != null && x != null && Math.abs(x - start) > 12) {
      didSwipe.current = true;
      clearLongPress();
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    clearLongPress();
    touchStartX.current = null;
    if (longPressFired.current) {
      event.preventDefault();
      return;
    }
    // Horizontal rail scroll — don't steal the gesture for image cycling or double-tap.
    if (didSwipe.current) {
      didSwipe.current = false;
      lastTap.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      event.preventDefault();
      toggleWishlist();
      return;
    }
    lastTap.current = now;
  };

  const openQuickAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (needsOptionSelection(product) || !resolveVariantId(undefined, product)) {
      setOptionsOpen(true);
      return;
    }
    setOptionsOpen(true);
  };

  return (
    <>
      <article
        className={cn(
          'group relative',
          // Desktop hover lift only
          !isList && 'lg:transition-transform lg:duration-300 lg:ease-out lg:hover:-translate-y-1',
          isList && 'flex gap-3 sm:gap-4',
          className,
        )}
        onMouseEnter={() => setWantHover(true)}
        onFocusCapture={() => setWantHover(true)}
      >
        <div
          className={cn(
            'bg-muted relative overflow-hidden',
            isList ? 'w-28 shrink-0 sm:w-40 sm:rounded-xl lg:w-48' : 'w-full',
          )}
        >
          <Link
            {...productHref}
            preload="intent"
            aria-label={`View ${product.name}`}
            className="block touch-manipulation"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Image
              key={primaryImage}
              src={primaryImage}
              alt={product.media?.[0]?.alt ?? product.name}
              sizes={sizes}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              containerClassName={isList ? 'aspect-[3/4]' : 'aspect-[3/4]'}
              className={cn(
                'transition-opacity duration-200',
                // Desktop-only hover zoom / swap
                'lg:transition-all lg:duration-700 lg:ease-out lg:group-hover:scale-[1.06]',
                hoverImage && hoverReady ? 'lg:group-hover:opacity-0' : undefined,
              )}
              onError={() => setPrimaryBroken(true)}
            />
            {/* Hover swap — desktop only */}
            {wantHover && hoverImage && hoverImage !== uniqueCandidates[0] ? (
              <Image
                src={hoverImage}
                alt=""
                sizes={sizes}
                loading="lazy"
                containerClassName={cn(
                  'absolute inset-0 hidden transition-opacity duration-700 ease-out lg:block',
                  hoverReady
                    ? 'opacity-0 lg:group-hover:opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
                className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                aria-hidden
                onLoad={() => setHoverReady(true)}
              />
            ) : null}

            {/* Double-tap heart burst */}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 z-[3] flex items-center justify-center lg:hidden',
                heartBurst ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Heart
                className={cn(
                  'size-14 text-white drop-shadow-md transition-transform duration-200',
                  heartBurst ? 'scale-100 fill-red-500 text-red-500' : 'scale-50',
                )}
              />
            </span>
          </Link>

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {discountPct ? (
              <Badge className="rounded-none bg-red-600 px-1.5 text-[9px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-[10px]">
                Save {discountPct}%
              </Badge>
            ) : null}
            {product.inStock === false || product.status === 'out_of_stock' ? (
              <Badge
                variant="outline"
                className="bg-card/90 rounded-none text-[9px] sm:text-[10px]"
              >
                Sold out
              </Badge>
            ) : null}
          </div>

          {/* Mobile wishlist — icon only, no box */}
          <div className="absolute right-1 top-1 z-[2] lg:hidden">
            <WishlistButton
              product={product}
              variant="ghost"
              className="size-10 rounded-none border-0 bg-transparent text-white shadow-none hover:bg-transparent hover:text-white aria-pressed:text-red-500 aria-pressed:hover:text-red-500 [&_svg]:size-[1.15rem] [&_svg]:drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]"
            />
          </div>

          {/* Desktop quick view — hover only */}
          <div className="absolute right-2.5 top-2.5 hidden opacity-0 transition-opacity lg:block lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
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
              className="bg-card absolute bottom-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 shadow-[var(--shadow-soft)] transition-opacity lg:group-hover:opacity-0"
              aria-label={`Rated ${averageRating} out of 5`}
            >
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-foreground text-[11px] font-bold leading-none">
                {averageRating.toFixed(1)}
              </span>
            </div>
          ) : null}

          {/* Desktop hover ATC — never on mobile */}
          {!isList ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden translate-y-full opacity-0 transition-all duration-300 ease-out lg:block lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <AddToCartButton
                product={product}
                label="Add to cart"
                className="h-11 w-full rounded-none border-0 bg-zinc-950 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-none hover:bg-zinc-900 hover:text-white"
              />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-1 opacity-0 transition-all duration-300 lg:block lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <AddToCartButton
                product={product}
                size="sm"
                className="w-full rounded-full shadow-[var(--shadow-elevated)]"
              />
            </div>
          )}

          {/* Mobile quick-add — icon only, no box */}
          {!isList ? (
            <button
              type="button"
              aria-label={`Quick add ${product.name}`}
              onClick={openQuickAdd}
              className="absolute bottom-1.5 right-1 z-[3] flex size-10 items-center justify-center bg-transparent text-white transition-transform duration-150 active:scale-90 lg:hidden"
            >
              <Plus className="size-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            'space-y-1 pt-2 lg:space-y-0 lg:pt-2.5',
            isList && 'flex flex-1 flex-col justify-center py-0.5',
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-foreground line-clamp-2 text-[13px] font-medium leading-snug tracking-wide lg:line-clamp-1 lg:text-sm">
              <Link {...productHref} preload="intent" className="lg:hover:underline">
                {title}
              </Link>
            </h3>
            <WishlistButton
              product={product}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground -mr-1.5 -mt-0.5 hidden size-7 shrink-0 rounded-full lg:inline-flex"
            />
          </div>

          <PriceDisplay
            price={product.price}
            salePrice={liveSale}
            compareAtPrice={product.compareAtPrice}
            discountPercent={product.isOnSale ? product.discountPercent : undefined}
            className="[&_*]:text-[13px] lg:[&_*]:text-sm"
          />
        </div>
      </article>

      <QuickViewModal product={product} open={quickOpen} onOpenChange={setQuickOpen} />
      <SelectOptionsSheet product={product} open={optionsOpen} onOpenChange={setOptionsOpen} />
    </>
  );
}

export const ProductCard = memo(ProductCardComponent);
