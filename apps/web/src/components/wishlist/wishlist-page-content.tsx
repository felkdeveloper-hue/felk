import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { HeartOff, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROUTES } from '@/constants';
import {
  useDefaultWishlistQuery,
  useMoveWishlistItemToCartMutation,
  useRemoveFromWishlistMutation,
} from '@/hooks/wishlist';
import type { EnrichedWishlistItem } from '@/utils/wishlist';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import { PriceDisplay } from '@/components/catalog/price-display';
import { useUiStore } from '@/store/ui-store';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';

export interface WishlistItemCardProps {
  wishlistId: string;
  item: EnrichedWishlistItem;
}

export function WishlistItemCard({ wishlistId, item }: WishlistItemCardProps) {
  const removeMutation = useRemoveFromWishlistMutation();
  const moveMutation = useMoveWishlistItemToCartMutation();
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);
  const title = item.productName ?? 'Product';
  const slug = item.productSlug ?? item.productId;

  const moveToCart = () => {
    moveMutation.mutate(
      { wishlistId, item },
      {
        onError: (error) => {
          const message = AppError.isAppError(error)
            ? error.message
            : 'Unable to move item to cart';
          toast.error(message);
        },
      },
    );
    setCartAnnouncement(`${title} moved to cart`);
    toast.success(`${title} moved to bag`);
  };

  const removeItem = () =>
    removeMutation.mutate({
      wishlistId,
      itemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
    });

  const primaryAction = item.variantId ? (
    <Button
      type="button"
      size="sm"
      className="h-9 flex-1 rounded-none text-[12px] font-semibold uppercase tracking-[0.06em] sm:h-9 sm:flex-1 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal"
      onClick={moveToCart}
      disabled={moveMutation.isPending}
    >
      <ShoppingCart className="size-3.5 sm:size-4" aria-hidden />
      Move to cart
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      className="h-9 flex-1 rounded-none text-[12px] font-semibold uppercase tracking-[0.06em] sm:h-9 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal"
      asChild
    >
      <Link to="/products/$slug" params={{ slug }} search={{ variant: undefined }}>
        Select options
      </Link>
    </Button>
  );

  const removeAction = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label="Remove from wishlist"
      className="size-9 shrink-0 rounded-none p-0 sm:size-9"
      onClick={removeItem}
      disabled={removeMutation.isPending}
    >
      <Trash2 className="size-3.5 sm:size-4" />
    </Button>
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'border-border/70 bg-card overflow-hidden border shadow-[var(--shadow-soft)]',
        // Mobile: compact horizontal row. Desktop+: original stacked card.
        'flex flex-row items-stretch rounded-none sm:block sm:rounded-[1.5rem]',
      )}
    >
      <Link
        to="/products/$slug"
        params={{ slug }}
        search={{ variant: undefined }}
        className="block w-[6.75rem] shrink-0 sm:w-full"
      >
        <Image src={item.thumbnailUrl} alt={title} aspectRatio="3/4" objectFit="cover" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 p-3 sm:space-y-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-[13px] font-medium leading-snug sm:text-sm">
            <Link
              to="/products/$slug"
              params={{ slug }}
              search={{ variant: undefined }}
              className="line-clamp-2 hover:underline"
            >
              {title}
            </Link>
          </h3>
          {item.variantTitle ? (
            <p className="text-muted-foreground truncate text-[11px] sm:text-xs">
              {item.variantTitle}
            </p>
          ) : null}

          {item.price ? (
            <>
              <div className="sm:hidden">
                <PriceDisplay
                  price={item.price}
                  salePrice={item.salePrice}
                  size="sm"
                  showInstallments={false}
                />
              </div>
              <div className="hidden sm:block">
                <PriceDisplay price={item.price} salePrice={item.salePrice} size="sm" />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {primaryAction}
          {removeAction}
        </div>
      </div>
    </motion.article>
  );
}

export function WishlistPageContent() {
  const wishlistQuery = useDefaultWishlistQuery();

  if (wishlistQuery.isLoading && !wishlistQuery.data) {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted h-[7.5rem] animate-pulse rounded-none sm:h-80 sm:rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (wishlistQuery.isError) {
    return (
      <div className="border-border rounded-xl border px-6 py-16 text-center">
        <p className="font-medium">Unable to load your wishlist</p>
        <p className="text-muted-foreground mt-2 text-sm">Check your connection and try again.</p>
        <Button className="mt-4" variant="outline" onClick={() => wishlistQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const wishlist = wishlistQuery.data;
  const items = wishlist?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="border-border rounded-xl border border-dashed px-6 py-16 text-center">
        <HeartOff className="text-muted-foreground mx-auto size-10" aria-hidden />
        <h2 className="font-display mt-4 text-2xl">Your wishlist is empty</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Save items you love and come back anytime.
        </p>
        <Button asChild className="mt-6">
          <Link to={ROUTES.products}>Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <WishlistItemCard key={item.id} wishlistId={wishlist!.id} item={item} />
      ))}
    </div>
  );
}
