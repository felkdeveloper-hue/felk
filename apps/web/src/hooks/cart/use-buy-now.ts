import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import { cartApi, type CartAddItemPayload } from '@/services/sdk';
import { useCartStore } from '@/store/cart-store';
import { useCheckoutStore } from '@/store/checkout-store';

/**
 * Buy Now — keep the bag intact, but checkout only the clicked SKU.
 * Navigates immediately; cart sync + checkout start finish in the background.
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

      // Leave the page instantly — checkout/start will ensure the SKU is in the bag.
      void navigate({ to: ROUTES.checkout });

      // Best-effort bag sync in the background (never blocks the button).
      void cartApi
        .addItem({ variantId: payload.variantId, quantity })
        .then((cart) => {
          queryClient.setQueryData(['cart'], cart);
          useCartStore.getState().setCart(cart);
        })
        .catch(() => {
          /* checkout start also ensures Buy Now SKUs */
        });

      return { variantId: payload.variantId, quantity };
    },
  });
}
