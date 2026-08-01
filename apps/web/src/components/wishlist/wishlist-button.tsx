import type { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  useAddToWishlistMutation,
  useDefaultWishlistQuery,
  useIsInWishlist,
  useRemoveFromWishlistMutation,
} from '@/hooks/wishlist';
import { useAuthStore } from '@/store';
import { useUiStore } from '@/store/ui-store';
import { resolveVariantId } from '@/utils/cart';
import type { Product } from '@/services/sdk';
import { productMetaFrom, trackCommerceEvent } from '@/lib/analytics';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WishlistButtonProps extends Omit<ButtonProps, 'onClick'> {
  product: Product;
  variantId?: string;
  iconOnly?: boolean;
}

export function WishlistButton({
  product,
  variantId,
  iconOnly = true,
  className,
  variant,
  ...props
}: WishlistButtonProps) {
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const resolvedVariantId = resolveVariantId(variantId, product);
  const isInWishlist = useIsInWishlist(product.id, resolvedVariantId);
  const wishlistQuery = useDefaultWishlistQuery();
  const addMutation = useAddToWishlistMutation();
  const removeMutation = useRemoveFromWishlistMutation();
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);

  const pending = addMutation.isPending || removeMutation.isPending;
  const active = isInWishlist;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (pending) return;

    const wishlistId = wishlistQuery.data?.id ?? (isAuthed ? 'default' : 'guest');
    const price = product.salePrice ?? product.effectivePrice ?? product.price;

    if (active) {
      const item = wishlistQuery.data?.items.find(
        (entry) =>
          entry.productId === product.id &&
          (resolvedVariantId ? entry.variantId === resolvedVariantId : true),
      );
      removeMutation.mutate(
        {
          wishlistId,
          itemId: item?.id ?? `guest-${product.id}-${resolvedVariantId ?? 'any'}`,
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

    addMutation.mutate(
      {
        productId: product.id,
        variantId: resolvedVariantId,
        wishlistId,
        productName: product.name,
        productSlug: product.slug,
        thumbnailUrl: product.thumbnailUrl ?? product.hoverImageUrl,
        price,
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
  };

  return (
    <motion.div whileTap={{ scale: 0.9 }}>
      <Button
        type="button"
        variant={variant ?? 'ghost'}
        size={iconOnly ? 'icon' : 'default'}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={active}
        className={cn(
          className,
          active
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={handleClick}
        {...props}
      >
        <Heart className={cn('size-4 transition-colors', active && 'fill-red-500 text-red-500')} />
        {!iconOnly ? (active ? 'Saved' : 'Save') : null}
      </Button>
    </motion.div>
  );
}
