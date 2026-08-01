import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { cartApi, type CartAddItemPayload } from '@/services/sdk';
import { useCartStore } from '@/store/cart-store';
import { useCheckoutStore } from '@/store/checkout-store';

/**
 * Buy Now — keep the bag intact, but checkout only the clicked SKU.
 */
export function useBuyNowMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: CartAddItemPayload) => {
      const quantity = payload.quantity ?? 1;
      useCheckoutStore.getState().resetCheckoutUi();
      useCheckoutStore.getState().setBuyNowItems([{ variantId: payload.variantId, quantity }]);
      queryClient.removeQueries({ queryKey: ['checkout'] });

      // Ensure the SKU is in the bag (other items stay for later).
      const cart = await cartApi.addItem({
        variantId: payload.variantId,
        quantity,
      });
      return cart;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart'], cart);
      useCartStore.getState().setCart(cart);
      void navigate({ to: ROUTES.checkout });
    },
  });
}
