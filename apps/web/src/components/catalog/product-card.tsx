import { memo, useCallback, useRef, useState, type TouchEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, Plus } from 'lucide-react';
import type { Product } from '@/services/sdk';
import { productsApi } from '@/services/sdk';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { useFlashSaleEligibility } from '@/hooks/use-flash-sale-eligibility';
import { ProductCardImage } from '@/components/catalog/product-card-image';
import {
  ProductFlashSaleBadge,
  ProductFlashSaleMobile,
} from '@/components/catalog/product-flash-sale-badge';
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
import { QUERY_KEYS } from '@/constants';
import { resolveVariantId } from '@/utils/cart';
import { productMetaFrom, trackCommerceEvent } from '@/lib/analytics';
import { PriceDisplay } from './price-display';
import { formatCurrency } from '@/utils';
import { BnplInstallmentHint } from './bnpl-installment-hint';
import { QuickViewModal } from './quick-view-modal';
import { isProductLowStock, isProductSoldOut } from '@/utils/catalog/stock';

/** Shared compact sale badge styling for product cards. */
export const SALE_BADGE_CLASS =
  'inline-flex w-fit items-center rounded-[4px] bg-[#b91c1c] px-1.5 py-[3px] text-[9px] font-bold uppercase leading-none tracking-[0.06em] text-white shadow-[0_1px_3px_rgba(185,28,28,0.25)] sm:rounded-none sm:px-2 sm:text-[10px] sm:shadow-none lg:rounded-none';

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
  const queryClient = useQueryClient();
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
  // Prefer full-resolution gallery URLs — thumbnails are ~400px and look soft on cards.
  const candidates = [
    cardMedia.find((item) => item.isPrimary)?.url,
    cardMedia[0]?.url,
    cardMedia[1]?.url,
    ...cardMedia.slice(2, 5).map((item) => item.url),
    product.thumbnailUrl,
    product.hoverImageUrl,
    cardMedia.find((item) => item.isPrimary)?.thumbnailUrl,
    cardMedia[0]?.thumbnailUrl,
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
  const didSwipe = useRef(false);

  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { isFlashSaleActive, formattedTime } = useFlashSale();
  const { eligible: flashEligible } = useFlashSaleEligibility(product);
  // Guest + logged-in: IP/device 1-hour flash sale applies to everyone (no auth gate).
  const showFlashSale = isFlashSaleActive && flashEligible;
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
  // Flash sale price: always apply 20% off to the current display price
  const flashPrice =
    displayPrice && displayPrice.amount > 0
      ? { ...displayPrice, amount: Math.round(displayPrice.amount * 0.8) }
      : undefined;
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

  const prefetchProduct = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.products.detail(product.slug),
      queryFn: () => productsApi.getBySlugOrId(product.slug),
      staleTime: 1000 * 60 * 5,
    });
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.products.detail(product.id),
      queryFn: () => productsApi.getById(product.id),
      staleTime: 1000 * 60 * 5,
    });
  }, [product.id, product.slug, queryClient]);

  const toggleWishlist = useCallback(() => {
    const wishlistId = wishlistQuery.data?.id ?? (isAuthed ? 'default' : 'guest');
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 220);

    if (isInWishlist) {
      const item = wishlistQuery.data?.items.find(
        (entry) =>
          entry.productId === product.id &&
          (resolvedVariantId ? entry.variantId === resolvedVariantId : true),
      );
      removeWishlist.mutate(
        {
          wishlistId,
          itemId: item?.id ?? `optimistic-${product.id}-${resolvedVariantId ?? 'any'}`,
          productId: product.id,
          variantId: resolvedVariantId,
        },
        {
          onSuccess: () => {
            setCartAnnouncement(`${product.name} removed from wishlist`);
            trackCommerceEvent(
              'remove_from_wishlist',
              productMetaFrom(product, { variantId: resolvedVariantId }),
            );
          },
          onError: () => {
            setCartAnnouncement('Could not update wishlist. Please try again.');
          },
        },
      );
      return;
    }

    addWishlist.mutate(
      {
        productId: product.id,
        variantId: resolvedVariantId,
        wishlistId,
        productName: product.name,
        productSlug: product.slug,
        thumbnailUrl: product.thumbnailUrl ?? product.hoverImageUrl,
        price: displayPrice,
      },
      {
        onSuccess: () => {
          setCartAnnouncement(`${product.name} added to wishlist`);
          trackCommerceEvent(
            'add_to_wishlist',
            productMetaFrom(product, { variantId: resolvedVariantId }),
          );
        },
        onError: () => {
          setCartAnnouncement('Could not update wishlist. Please try again.');
        },
      },
    );
  }, [
    addWishlist,
    displayPrice,
    isAuthed,
    isInWishlist,
    product,
    removeWishlist,
    resolvedVariantId,
    setCartAnnouncement,
    wishlistQuery.data?.id,
    wishlistQuery.data?.items,
  ]);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    didSwipe.current = false;
  };

  const onTouchMove = (event: TouchEvent) => {
    const start = touchStartX.current;
    const x = event.touches[0]?.clientX;
    if (start != null && x != null && Math.abs(x - start) > 12) {
      didSwipe.current = true;
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    touchStartX.current = null;
    // Horizontal rail scroll — don't steal the gesture for double-tap wishlist.
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

  const isSoldOut = isProductSoldOut(product);
  const isLowStock = isProductLowStock(product);

  const openQuickAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSoldOut) return;
    prefetchProduct();
    // Seed detail cache so the sheet paints without waiting on the network.
    queryClient.setQueryData(QUERY_KEYS.products.detail(product.id), (prev) => prev ?? product);
    setOptionsOpen(true);
  };

  return (
    <>
      <article
        className={cn(
          'group relative transition-transform duration-150 ease-out active:scale-[0.985] lg:active:scale-100',
          !isList && 'lg:transition-transform lg:duration-300 lg:ease-out lg:hover:-translate-y-1',
          isList && 'flex gap-3 sm:gap-4',
          className,
        )}
        onMouseEnter={() => {
          setWantHover(true);
          prefetchProduct();
        }}
        onFocusCapture={() => {
          setWantHover(true);
          prefetchProduct();
        }}
        onPointerDown={prefetchProduct}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-[10px] lg:rounded-none',
            isList ? 'w-28 shrink-0 sm:w-40 sm:rounded-xl lg:w-48' : 'w-full',
          )}
        >
          <Link
            {...productHref}
            preload="intent"
            aria-label={`View ${product.name}`}
            className="block touch-manipulation"
            onClick={() => {
              const meta = productMetaFrom(product, { variantId: resolvedVariantId });
              trackCommerceEvent('product_card_clicked', meta);
              trackCommerceEvent('product_image_clicked', meta);
              try {
                const q = new URLSearchParams(window.location.search).get('q');
                if (window.location.pathname.startsWith('/search') && q) {
                  trackCommerceEvent('search_result_clicked', meta, { query: q });
                }
              } catch {
                /* ignore */
              }
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ProductCardImage
              key={primaryImage}
              src={primaryImage}
              alt={product.media?.[0]?.alt ?? product.name}
              sizes={sizes}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              containerClassName="rounded-[10px] lg:rounded-none"
              className={cn(hoverImage && hoverReady ? 'lg:group-hover:opacity-0' : undefined)}
              onError={() => setPrimaryBroken(true)}
            />
            {/* Hover swap — desktop only */}
            {wantHover && hoverImage && hoverImage !== uniqueCandidates[0] ? (
              <div
                className={cn(
                  'absolute inset-0 hidden transition-opacity duration-700 ease-out lg:block',
                  hoverReady
                    ? 'opacity-0 lg:group-hover:opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
                aria-hidden
              >
                <ProductCardImage
                  src={hoverImage}
                  alt=""
                  sizes={sizes}
                  loading="lazy"
                  fillContainer
                  onLoad={() => setHoverReady(true)}
                />
              </div>
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

          {showFlashSale ? <ProductFlashSaleMobile formattedTime={formattedTime} /> : null}

          {/* Desktop status badges */}
          <div className="absolute left-3 top-3 z-[2] hidden w-auto flex-col items-start gap-1.5 sm:flex">
            {showFlashSale ? <ProductFlashSaleBadge formattedTime={formattedTime} /> : null}
            {discountPct ? <span className={SALE_BADGE_CLASS}>Save {discountPct}%</span> : null}
            {isSoldOut ? (
              <Badge
                variant="outline"
                className="bg-card/90 rounded-none text-[9px] sm:text-[10px]"
              >
                Sold out
              </Badge>
            ) : isLowStock ? (
              <span className={SALE_BADGE_CLASS}>Low in Stock</span>
            ) : null}
          </div>

          {/* Mobile status badges (non-flash) */}
          <div className="absolute left-2 top-2 z-[2] flex w-auto flex-col items-start gap-1 sm:hidden">
            {discountPct ? (
              <span className={cn(SALE_BADGE_CLASS, showFlashSale && 'mt-[2.125rem]')}>
                Save {discountPct}%
              </span>
            ) : null}
            {isSoldOut ? (
              <span
                className={cn(
                  'inline-flex w-fit items-center rounded-[4px] border border-neutral-200/80 bg-white/95 px-1.5 py-[3px] text-[9px] font-semibold uppercase leading-none tracking-wide text-neutral-700 backdrop-blur-sm',
                  showFlashSale && !discountPct && 'mt-[2.125rem]',
                )}
              >
                Sold out
              </span>
            ) : isLowStock ? (
              <span
                className={cn(SALE_BADGE_CLASS, showFlashSale && !discountPct && 'mt-[2.125rem]')}
              >
                Low in Stock
              </span>
            ) : null}
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
              className="bg-white/92 absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full border border-white/60 px-1.5 py-0.5 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.2)] backdrop-blur-[2px] transition-opacity lg:group-hover:opacity-0"
              aria-label={`Rated ${averageRating} out of 5`}
            >
              <span className="text-[9px] leading-none text-amber-500">★</span>
              <span className="text-[10px] font-semibold tabular-nums leading-none text-neutral-800">
                {averageRating.toFixed(1)}
              </span>
            </div>
          ) : null}

          {/* Desktop hover ATC — never on mobile */}
          {!isSoldOut && !isList ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden translate-y-full opacity-0 transition-all duration-300 ease-out lg:block lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <AddToCartButton
                product={product}
                label="Add to cart"
                className="h-11 w-full rounded-none border-0 bg-zinc-950 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-none hover:bg-zinc-900 hover:text-white"
              />
            </div>
          ) : null}
          {!isSoldOut && isList ? (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-1 opacity-0 transition-all duration-300 lg:block lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <AddToCartButton
                product={product}
                size="sm"
                className="w-full rounded-full shadow-[var(--shadow-elevated)]"
              />
            </div>
          ) : null}
          {isSoldOut ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden lg:block">
              <div className="flex h-11 w-full items-center justify-center bg-zinc-950/85 text-[11px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity lg:group-hover:opacity-100">
                Out of stock
              </div>
            </div>
          ) : null}

          {/* Mobile quick-add — icon only, no box */}
          {!isList && !isSoldOut ? (
            <button
              type="button"
              aria-label={`Quick add ${product.name}`}
              onClick={openQuickAdd}
              className="bg-white/92 absolute bottom-2 right-2 z-[3] flex size-8 items-center justify-center rounded-full border border-white/70 text-neutral-800 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-transform duration-150 active:scale-90 lg:hidden"
            >
              <Plus className="size-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            'flex flex-col pt-2 max-lg:gap-0 lg:space-y-0 lg:pt-2.5',
            isList && 'flex flex-1 flex-col justify-center py-0.5',
          )}
        >
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="text-foreground line-clamp-2 text-[13px] font-medium leading-[1.35] tracking-normal lg:line-clamp-1 lg:text-sm lg:tracking-wide">
              <Link {...productHref} preload="intent" className="lg:hover:underline">
                {title}
              </Link>
            </h3>
            <WishlistButton
              product={product}
              variant="ghost"
              className={cn(
                'inline-flex size-7 shrink-0 rounded-full transition-transform duration-150 active:scale-90 lg:-mr-1.5 lg:-mt-0.5 lg:size-7',
                isInWishlist || heartBurst
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-neutral-400 hover:text-neutral-700 max-lg:[&_svg]:stroke-[1.5]',
              )}
            />
          </div>

          <div className="mt-1 max-lg:mt-1 lg:mt-0">
            {flashPrice && displayPrice && showFlashSale ? (
              <div className="space-y-0.5 max-lg:space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  {liveSale && originalPrice && originalPrice.amount > displayPrice.amount ? (
                    <>
                      <span className="text-muted-foreground text-[11px] text-neutral-400 line-through lg:text-[13px]">
                        {formatCurrency(
                          originalPrice.amount,
                          originalPrice.currency ?? displayPrice.currency,
                        )}
                      </span>
                      <span className="text-[11px] text-[#ef4444] line-through lg:text-[13px]">
                        {formatCurrency(displayPrice.amount, displayPrice.currency)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-[11px] text-neutral-400 line-through lg:text-[13px]">
                      {formatCurrency(displayPrice.amount, displayPrice.currency)}
                    </span>
                  )}
                  <span className="text-[14px] font-semibold tracking-tight text-[#ea580c] lg:text-sm lg:font-bold">
                    {formatCurrency(flashPrice.amount, flashPrice.currency)}
                  </span>
                </div>
                <BnplInstallmentHint amount={flashPrice.amount} currency={flashPrice.currency} />
              </div>
            ) : (
              <PriceDisplay
                price={product.price}
                salePrice={liveSale}
                compareAtPrice={product.compareAtPrice}
                discountPercent={product.isOnSale ? product.discountPercent : undefined}
                showInstallments={true}
              />
            )}
          </div>
        </div>
      </article>

      <QuickViewModal product={product} open={quickOpen} onOpenChange={setQuickOpen} />
      <SelectOptionsSheet product={product} open={optionsOpen} onOpenChange={setOptionsOpen} />
    </>
  );
}

export const ProductCard = memo(ProductCardComponent);
