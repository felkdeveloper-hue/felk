import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  cartApi,
  type CartAddItemPayload,
  type CartUpdateItemPayload,
  type CartView,
} from '@/services/sdk';
import { useAuthStore } from '@/store';
import { useCartStore } from '@/store/cart-store';

function syncCartToStore(cart: CartView | null) {
  useCartStore.getState().setCart(cart);
}

export function useCartQuery(options?: { enabled?: boolean }) {
  const setCart = useCartStore((state) => state.setCart);

  return useQuery({
    queryKey: QUERY_KEYS.cart.current(),
    queryFn: async () => {
      const cart = await cartApi.get();
      setCart(cart);
      return cart;
    },
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}

export function useCartBootstrap() {
  useCartQuery();
  useCartMergeOnLogin();
}

export function useCartMergeOnLogin() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const guestCartToken = useCartStore((state) => state.guestCartToken);
  const mergeMutation = useMergeCartMutation();

  useEffect(() => {
    if (!accessToken || !guestCartToken || mergeMutation.isPending) return;
    mergeMutation.mutate(guestCartToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, guestCartToken]);
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const setSyncing = useCartStore((state) => state.setSyncing);

  return useMutation({
    mutationFn: (payload: CartAddItemPayload) => cartApi.addItem(payload),
    onMutate: async (payload) => {
      setSyncing(true);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart.current() });
      const previous = queryClient.getQueryData<CartView>(QUERY_KEYS.cart.current());

      if (previous) {
        const existing = previous.items.find((item) => item.variantId === payload.variantId);
        const nextItems = existing
          ? previous.items.map((item) =>
              item.variantId === payload.variantId
                ? {
                    ...item,
                    quantity: item.quantity + (payload.quantity ?? 1),
                    totalPrice: item.unitPrice * (item.quantity + (payload.quantity ?? 1)),
                  }
                : item,
            )
          : [
              ...previous.items,
              {
                id: `optimistic-${payload.variantId}`,
                productId: '',
                variantId: payload.variantId,
                name: 'Adding…',
                quantity: payload.quantity ?? 1,
                unitPrice: 0,
                totalPrice: 0,
              },
            ];

        const optimistic = {
          ...previous,
          items: nextItems,
          totals: {
            ...previous.totals,
            itemCount: nextItems.length,
            totalQuantity: nextItems.reduce((sum, item) => sum + item.quantity, 0),
          },
        };
        queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
        syncCartToStore(optimistic);
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.cart.current(), context.previous);
        syncCartToStore(context.previous);
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
    onSettled: () => setSyncing(false),
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const setSyncing = useCartStore((state) => state.setSyncing);

  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: CartUpdateItemPayload }) =>
      cartApi.updateItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      setSyncing(true);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart.current() });
      const previous = queryClient.getQueryData<CartView>(QUERY_KEYS.cart.current());

      if (previous) {
        const optimistic = {
          ...previous,
          items: previous.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: payload.quantity,
                  totalPrice: item.unitPrice * payload.quantity,
                }
              : item,
          ),
        };
        queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
        syncCartToStore(optimistic);
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.cart.current(), context.previous);
        syncCartToStore(context.previous);
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
    onSettled: () => setSyncing(false),
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const setSyncing = useCartStore((state) => state.setSyncing);

  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onMutate: async (itemId) => {
      setSyncing(true);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart.current() });
      const previous = queryClient.getQueryData<CartView>(QUERY_KEYS.cart.current());

      if (previous) {
        const optimistic = {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
        };
        queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
        syncCartToStore(optimistic);
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.cart.current(), context.previous);
        syncCartToStore(context.previous);
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
    onSettled: () => setSyncing(false),
  });
}

export function useValidateCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.validate(),
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
  });
}

export function useMergeCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guestCartToken: string) => cartApi.merge(guestCartToken),
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
  });
}

export function useRefreshCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.get(),
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      syncCartToStore(cart);
    },
  });
}
