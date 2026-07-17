import { Heart } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';
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
  ...props
}: WishlistButtonProps) {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const resolvedVariantId = resolveVariantId(variantId, product);
  const isInWishlist = useIsInWishlist(product.id, resolvedVariantId);
  const wishlistQuery = useDefaultWishlistQuery();
  const addMutation = useAddToWishlistMutation();
  const removeMutation = useRemoveFromWishlistMutation();
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);

  const pending = addMutation.isPending || removeMutation.isPending;
  const active = isInWishlist;

  const handleClick = () => {
    if (!isAuthed) {
      navigate({ to: ROUTES.authLogin, search: { redirect: window.location.pathname } });
      return;
    }

    const wishlistId = wishlistQuery.data?.id;
    if (!wishlistId) return;

    if (active) {
      const item = wishlistQuery.data?.items.find(
        (entry) =>
          entry.productId === product.id &&
          (resolvedVariantId ? entry.variantId === resolvedVariantId : true),
      );
      if (!item) return;
      removeMutation.mutate(
        { wishlistId, itemId: item.id },
        {
          onSuccess: () => setCartAnnouncement(`${product.name} removed from wishlist`),
        },
      );
      return;
    }

    addMutation.mutate(
      { productId: product.id, variantId: resolvedVariantId, wishlistId },
      {
        onSuccess: () => setCartAnnouncement(`${product.name} added to wishlist`),
      },
    );
  };

  return (
    <motion.div whileTap={{ scale: 0.94 }}>
      <Button
        type="button"
        variant={active ? 'default' : 'secondary'}
        size={iconOnly ? 'icon' : 'default'}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={active}
        className={cn(className)}
        onClick={handleClick}
        loading={pending}
        {...props}
      >
        <Heart className={cn('size-4', active && 'fill-current')} />
        {!iconOnly ? (active ? 'Saved' : 'Save') : null}
      </Button>
    </motion.div>
  );
}
