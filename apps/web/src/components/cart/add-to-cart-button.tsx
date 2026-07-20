import { useAddToCartMutation } from '@/hooks/cart';
import { resolveVariantId } from '@/utils/cart';
import { useUiStore } from '@/store/ui-store';
import type { Product } from '@/services/sdk';
import { trackingApi } from '@/services/sdk/tracking';
import { Button, type ButtonProps } from '@/components/ui/button';
import { AppError } from '@/lib/errors';
import { toast } from 'sonner';

export interface AddToCartButtonProps extends Omit<ButtonProps, 'onClick'> {
  product: Product;
  variantId?: string;
  quantity?: number;
  label?: string;
}

export function AddToCartButton({
  product,
  variantId,
  quantity = 1,
  label = 'Add to cart',
  disabled,
  loading,
  ...props
}: AddToCartButtonProps) {
  const addMutation = useAddToCartMutation();
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
          toast.success(`${product.name} added to bag`);
          const price =
            typeof product.price === 'number'
              ? product.price
              : ((product.price as { amount?: number })?.amount ?? 0);
          void trackingApi.addToCart(resolvedVariantId, product.name, 'LKR', price);
        },
        onError: (error) => {
          const message = AppError.isAppError(error) ? error.message : 'Unable to add item to cart';
          setCartAnnouncement(message);
          toast.error(message);
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
