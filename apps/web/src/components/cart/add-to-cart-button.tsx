import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAddToCartMutation } from '@/hooks/cart';
import { resolveVariantId } from '@/utils/cart';
import { needsOptionSelection } from '@/utils/catalog/needs-option-selection';
import { useUiStore } from '@/store/ui-store';
import type { Product } from '@/services/sdk';
import { productsApi } from '@/services/sdk';
import { trackingApi } from '@/services/sdk/tracking';
import { productMetaFrom, trackCommerceEvent } from '@/lib/analytics';
import { Button, type ButtonProps } from '@/components/ui/button';
import { SelectOptionsSheet } from '@/components/catalog/select-options-sheet';
import { AppError } from '@/lib/errors';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/constants';

export interface AddToCartButtonProps extends Omit<ButtonProps, 'onClick'> {
  product: Product;
  variantId?: string;
  quantity?: number;
  label?: string;
  /** Called after a successful add (e.g. close an options sheet). */
  onAdded?: () => void;
  /**
   * When true, always add with the resolved variant — used inside the options sheet
   * so we do not re-open the sheet.
   */
  skipOptionGate?: boolean;
}

function isProductOutOfStock(product: Product) {
  return product.inStock === false || product.status === 'out_of_stock';
}

function productUnitPrice(product: Product): number {
  const sale = product.salePrice?.amount;
  if (typeof sale === 'number' && sale > 0) return sale;
  const effective = product.effectivePrice?.amount;
  if (typeof effective === 'number' && effective > 0) return effective;
  if (typeof product.price === 'number') return product.price;
  return (product.price as { amount?: number } | undefined)?.amount ?? 0;
}

export function AddToCartButton({
  product,
  variantId,
  quantity = 1,
  label = 'Add to cart',
  disabled,
  loading,
  onAdded,
  skipOptionGate = false,
  ...props
}: AddToCartButtonProps) {
  const queryClient = useQueryClient();
  const addMutation = useAddToCartMutation();
  const setCartAnnouncement = useUiStore((state) => state.setCartAnnouncement);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const resolvedVariantId = resolveVariantId(variantId, product);
  const outOfStock = isProductOutOfStock(product);
  const mustPickOptions = !skipOptionGate && !variantId && needsOptionSelection(product);
  const isDisabled = disabled || outOfStock || (!mustPickOptions && !resolvedVariantId);

  const openOptionsSheet = () => {
    queryClient.setQueryData(QUERY_KEYS.products.detail(product.id), (prev) => prev ?? product);
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.products.detail(product.id),
      queryFn: () => productsApi.getById(product.id),
      staleTime: 1000 * 60 * 5,
    });
    setOptionsOpen(true);
  };

  const handleClick = () => {
    if (outOfStock) {
      toast.error('This item is out of stock');
      return;
    }
    if (mustPickOptions) {
      openOptionsSheet();
      return;
    }
    if (!resolvedVariantId) return;

    const unitPrice = productUnitPrice(product);

    // Optimistic bag + badge update fires in onMutate — close / toast immediately.
    addMutation.mutate(
      {
        variantId: resolvedVariantId,
        quantity,
        optimistic: {
          productId: product.id,
          name: product.name,
          unitPrice,
          imageUrl: product.thumbnailUrl ?? product.hoverImageUrl,
          productSlug: product.slug,
        },
      },
      {
        onSuccess: () => {
          setJustAdded(true);
          setCartAnnouncement(`${product.name} added to cart`);
          toast.success(`${product.name} added to bag`);
          void trackingApi.addToCart(resolvedVariantId, product.name, 'LKR', unitPrice, quantity);
          trackCommerceEvent(
            'add_to_cart',
            productMetaFrom(product, { variantId: resolvedVariantId, quantity }),
          );
          onAdded?.();
        },
        onError: (error) => {
          setJustAdded(false);
          const message = AppError.isAppError(error) ? error.message : 'Unable to add item to cart';
          setCartAnnouncement(message);
          toast.error(message);
        },
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={isDisabled || justAdded}
        loading={Boolean(loading)}
        {...props}
      >
        {outOfStock ? 'Out of stock' : justAdded ? 'Added' : label}
      </Button>
      {!skipOptionGate && !outOfStock ? (
        <SelectOptionsSheet product={product} open={optionsOpen} onOpenChange={setOptionsOpen} />
      ) : null}
    </>
  );
}
