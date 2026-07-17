import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { customersApi, cartApi, type Wishlist } from '@/services/sdk';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store';
import { getDefaultWishlist, normalizeWishlist, type EnrichedWishlistItem } from '@/utils/wishlist';

function useIsAuthed() {
  return useAuthStore((state) => Boolean(state.accessToken && state.user));
}

export function useWishlistsQuery() {
  const isAuthed = useIsAuthed();

  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlists(),
    queryFn: () => customersApi.listWishlists(),
    enabled: isAuthed,
    staleTime: 1000 * 60,
  });
}

export function useDefaultWishlistQuery() {
  const isAuthed = useIsAuthed();
  const wishlistsQuery = useWishlistsQuery();
  const defaultWishlist = wishlistsQuery.data ? getDefaultWishlist(wishlistsQuery.data) : undefined;

  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlist(defaultWishlist?.id ?? 'default'),
    queryFn: async () => {
      if (!defaultWishlist?.id) {
        const created = await customersApi.createWishlist('My Wishlist');
        const full = await customersApi.getWishlist(created.id);
        return normalizeWishlist(full);
      }
      const full = await customersApi.getWishlist(defaultWishlist.id);
      return normalizeWishlist(full);
    },
    enabled: isAuthed && wishlistsQuery.isSuccess,
    staleTime: 1000 * 30,
  });
}

export function useWishlistItemCountQuery() {
  const isAuthed = useIsAuthed();

  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlists(),
    queryFn: () => customersApi.listWishlists(),
    enabled: isAuthed,
    staleTime: 1000 * 60,
    select: (wishlists) =>
      wishlists.reduce((sum, wishlist) => sum + Number(wishlist.itemCount ?? 0), 0),
  });
}

export function useIsInWishlist(productId?: string, variantId?: string) {
  const wishlistQuery = useDefaultWishlistQuery();
  const items = wishlistQuery.data?.items ?? [];

  return items.some(
    (item) => item.productId === productId && (variantId ? item.variantId === variantId : true),
  );
}

export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      variantId,
      wishlistId,
    }: {
      productId: string;
      variantId?: string;
      wishlistId?: string;
    }) => {
      let targetId = wishlistId;
      if (!targetId) {
        const wishlists = await customersApi.listWishlists();
        targetId = getDefaultWishlist(wishlists)?.id;
        if (!targetId) {
          const created = await customersApi.createWishlist('My Wishlist');
          targetId = created.id;
        }
      }

      const current = await customersApi.getWishlist(targetId);
      const duplicate = current.items.some(
        (item) =>
          String(item.productId) === productId &&
          (variantId ? String(item.variantId) === variantId : true),
      );
      if (duplicate) {
        return normalizeWishlist(current);
      }

      const updated = await customersApi.addWishlistItem(targetId, { productId, variantId });
      return normalizeWishlist(updated);
    },
    onMutate: async ({ productId, variantId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
      const previous = queryClient.getQueryData<ReturnType<typeof normalizeWishlist>>(
        QUERY_KEYS.customers.wishlist('default'),
      );

      if (previous) {
        const optimisticItem: EnrichedWishlistItem = {
          id: `optimistic-${productId}`,
          productId,
          variantId,
          productName: 'Adding…',
        };
        queryClient.setQueryData(QUERY_KEYS.customers.wishlist(previous.id), {
          ...previous,
          items: [...previous.items, optimisticItem],
          itemCount: previous.items.length + 1,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          QUERY_KEYS.customers.wishlist(context.previous.id),
          context.previous,
        );
      }
    },
    onSuccess: (wishlist) => {
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist(wishlist.id), wishlist);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishlistId, itemId }: { wishlistId: string; itemId: string }) => {
      const updated = await customersApi.removeWishlistItem(wishlistId, itemId);
      return normalizeWishlist(updated);
    },
    onMutate: async ({ wishlistId, itemId }) => {
      const key = QUERY_KEYS.customers.wishlist(wishlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ReturnType<typeof normalizeWishlist>>(key);

      if (previous) {
        queryClient.setQueryData(key, {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
          itemCount: Math.max(0, previous.items.length - 1),
        });
      }

      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (wishlist) => {
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist(wishlist.id), wishlist);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
    },
  });
}

export function useMoveWishlistItemToCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wishlistId,
      item,
    }: {
      wishlistId: string;
      item: EnrichedWishlistItem;
    }) => {
      if (!item.variantId) {
        throw new Error('Variant is required to move item to cart');
      }
      const cart = await cartApi.addItem({ variantId: item.variantId, quantity: 1 });
      await customersApi.removeWishlistItem(wishlistId, item.id);
      return cart;
    },
    onSuccess: (cart, variables) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      useCartStore.getState().setCart(cart);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customers.wishlist(variables.wishlistId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
    },
  });
}

export type { Wishlist };
