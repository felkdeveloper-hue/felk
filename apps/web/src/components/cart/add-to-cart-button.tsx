import { useAddToCartMutation } from '@/hooks/cart';
import { resolveVariantId } from '@/utils/cart';
import { useUiStore } from '@/store/ui-store';
import type { Product } from '@/services/sdk';
import { Button, type ButtonProps } from '@/components/ui/button';
import { AppError } from '@/lib/errors';

export interface AddToCartButtonProps extends Omit<ButtonProps, 'onClick'> {
  product: Product;
  variantId?: string;
  quantity?: number;
  label?: string;
  openDrawer?: boolean;
}

export function AddToCartButton({
  product,
  variantId,
  quantity = 1,
  label = 'Add to cart',
  openDrawer = true,
  disabled,
  loading,
  ...props
}: AddToCartButtonProps) {
  const addMutation = useAddToCartMutation();
  const setCartDrawerOpen = useUiStore((state) => state.setCartDrawerOpen);
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);

  const resolvedVariantId = resolveVariantId(variantId, product);
  const isDisabled = disabled || !resolvedVariantId || product.status === 'out_of_stock';

  const handleClick = () => {
    if (!resolvedVariantId) return;

    addMutation.mutate(
      { variantId: resolvedVariantId, quantity },
      {
        onSuccess: () => {
          setCartAnnouncement(`${product.name} added to cart`);
          if (openDrawer) setCartDrawerOpen(true);
        },
        onError: (error) => {
          const message = AppError.isAppError(error) ? error.message : 'Unable to add item to cart';
          setCartAnnouncement(message);
        },
      },
    );
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      loading={loading || addMutation.isPending}
      {...props}
    >
      {label}
    </Button>
  );
}
