import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  cartApi,
  type CartAddItemPayload,
  type CartLineItem,
  type CartUpdateItemPayload,
  type CartView,
} from '@/services/sdk';
import { useAuthStore } from '@/store';
import { useCartStore } from '@/store/cart-store';
import { trackCommerceEvent } from '@/lib/analytics';
import { fireAddToCartPixel, prepareCartAddMeta } from '@/lib/analytics/add-to-cart-meta';

function syncCartToStore(cart: CartView | null) {
  useCartStore.getState().setCart(cart);
}

/** Client-only fields for instant bag UI — stripped before the API call. */
export type CartAddItemInput = CartAddItemPayload & {
  optimistic?: {
    productId?: string;
    name?: string;
    unitPrice?: number;
    imageUrl?: string;
    productSlug?: string;
    colorName?: string;
    sizeName?: string;
  };
};

function emptyCartView(): CartView {
  return {
    id: 'local',
    items: [],
    totals: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      currency: 'LKR',
      itemCount: 0,
      totalQuantity: 0,
    },
  };
}

function readCartSnapshot(queryClient: ReturnType<typeof useQueryClient>): CartView {
  return (
    queryClient.getQueryData<CartView>(QUERY_KEYS.cart.current()) ??
    useCartStore.getState().cart ??
    emptyCartView()
  );
}

function withTotals(items: CartLineItem[], previous: CartView): CartView {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    ...previous,
    items,
    totals: {
      ...previous.totals,
      subtotal,
      total: subtotal + (previous.totals.shipping ?? 0) - (previous.totals.discount ?? 0),
      itemCount: items.length,
      totalQuantity,
      currency: previous.totals.currency ?? 'LKR',
    },
  };
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
    mutationFn: async ({ optimistic, ...payload }: CartAddItemInput) => {
      const meta = await prepareCartAddMeta();
      const cart = await cartApi.addItem({
        variantId: payload.variantId,
        quantity: payload.quantity,
        warehouseId: payload.warehouseId,
        eventId: meta.eventId,
        ...(meta.fbp ? { fbp: meta.fbp } : {}),
        ...(meta.fbc ? { fbc: meta.fbc } : {}),
      });
      await fireAddToCartPixel({
        eventId: meta.eventId,
        variantId: payload.variantId,
        contentName: optimistic?.name ?? 'Product',
        unitPrice: optimistic?.unitPrice ?? 0,
        quantity: payload.quantity ?? 1,
      });
      trackCommerceEvent('add_to_cart', {
        productId: optimistic?.productId ?? null,
        productName: optimistic?.name ?? null,
        sku: null,
        category: null,
        variantId: payload.variantId,
        variantLabel: optimistic?.sizeName ?? optimistic?.colorName ?? null,
        price: optimistic?.unitPrice ?? null,
        quantity: payload.quantity ?? 1,
        currency: 'LKR',
      });
      return cart;
    },
    onMutate: async (payload) => {
      setSyncing(true);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart.current() });
      const previous = readCartSnapshot(queryClient);
      const qty = payload.quantity ?? 1;
      const existing = previous.items.find((item) => item.variantId === payload.variantId);

      const nextItems = existing
        ? previous.items.map((item) =>
            item.variantId === payload.variantId
              ? {
                  ...item,
                  quantity: item.quantity + qty,
                  totalPrice: item.unitPrice * (item.quantity + qty),
                }
              : item,
          )
        : [
            ...previous.items,
            {
              id: `optimistic-${payload.variantId}`,
              productId: payload.optimistic?.productId ?? '',
              productSlug: payload.optimistic?.productSlug,
              variantId: payload.variantId,
              name: payload.optimistic?.name ?? 'Product',
              quantity: qty,
              unitPrice: payload.optimistic?.unitPrice ?? 0,
              totalPrice: (payload.optimistic?.unitPrice ?? 0) * qty,
              imageUrl: payload.optimistic?.imageUrl,
              colorName: payload.optimistic?.colorName,
              sizeName: payload.optimistic?.sizeName,
              currency: previous.totals.currency ?? 'LKR',
              inStock: true,
            } satisfies CartLineItem,
          ];

      const optimistic = withTotals(nextItems, previous);
      queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
      syncCartToStore(optimistic);

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
      const previous = readCartSnapshot(queryClient);

      const nextItems = previous.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: payload.quantity,
              totalPrice: item.unitPrice * payload.quantity,
            }
          : item,
      );
      const optimistic = withTotals(nextItems, previous);
      queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
      syncCartToStore(optimistic);

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
      const previous = readCartSnapshot(queryClient);

      const nextItems = previous.items.filter((item) => item.id !== itemId);
      const optimistic = withTotals(nextItems, previous);
      queryClient.setQueryData(QUERY_KEYS.cart.current(), optimistic);
      syncCartToStore(optimistic);

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
      useCartStore.getState().setGuestCartToken(null);
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
