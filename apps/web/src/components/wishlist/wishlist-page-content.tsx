import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { HeartOff, ShoppingCart, Trash2 } from 'lucide-react';
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

export interface WishlistItemCardProps {
  wishlistId: string;
  item: EnrichedWishlistItem;
}

export function WishlistItemCard({ wishlistId, item }: WishlistItemCardProps) {
  const removeMutation = useRemoveFromWishlistMutation();
  const moveMutation = useMoveWishlistItemToCartMutation();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="border-border/70 bg-card overflow-hidden rounded-[1.5rem] border shadow-[var(--shadow-soft)]"
    >
      <Link
        to="/products/$slug"
        params={{ slug: item.productSlug ?? item.productId }}
        className="block"
      >
        <Image src={item.thumbnailUrl} alt={item.productName ?? 'Product'} aspectRatio="3/4" />
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-medium">
            <Link
              to="/products/$slug"
              params={{ slug: item.productSlug ?? item.productId }}
              className="hover:underline"
            >
              {item.productName ?? 'Product'}
            </Link>
          </h3>
          {item.variantTitle ? (
            <p className="text-muted-foreground text-xs">{item.variantTitle}</p>
          ) : null}
          {item.variantSku ? (
            <p className="text-muted-foreground text-xs">SKU: {item.variantSku}</p>
          ) : null}
        </div>

        {item.price ? (
          <PriceDisplay price={item.price} salePrice={item.salePrice} size="sm" />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={() => moveMutation.mutate({ wishlistId, item })}
            loading={moveMutation.isPending}
            disabled={!item.variantId}
          >
            <ShoppingCart className="size-4" aria-hidden />
            Move to cart
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Remove from wishlist"
            onClick={() => removeMutation.mutate({ wishlistId, itemId: item.id })}
            loading={removeMutation.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export function WishlistPageContent() {
  const wishlistQuery = useDefaultWishlistQuery();

  if (wishlistQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted h-80 animate-pulse rounded-xl" />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <WishlistItemCard key={item.id} wishlistId={wishlist!.id} item={item} />
      ))}
    </div>
  );
}
