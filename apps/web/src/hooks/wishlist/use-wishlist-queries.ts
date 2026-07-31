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

type NormalizedWishlist = ReturnType<typeof normalizeWishlist>;

function findCachedWishlist(
  queryClient: ReturnType<typeof useQueryClient>,
  wishlistId?: string,
): { key: readonly unknown[]; wishlist: NormalizedWishlist } | undefined {
  const candidates = [
    wishlistId ? QUERY_KEYS.customers.wishlist(wishlistId) : undefined,
    QUERY_KEYS.customers.wishlist('default'),
  ].filter(Boolean) as Array<ReturnType<typeof QUERY_KEYS.customers.wishlist>>;

  for (const key of candidates) {
    const wishlist = queryClient.getQueryData<NormalizedWishlist>(key);
    if (wishlist) return { key, wishlist };
  }

  // Detail keys are ['customers','me','wishlists', id] — pick any hydrated detail cache.
  const detailMatches = queryClient.getQueriesData<NormalizedWishlist>({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key.length === 4 &&
        key[0] === 'customers' &&
        key[1] === 'me' &&
        key[2] === 'wishlists' &&
        typeof key[3] === 'string'
      );
    },
  });

  for (const [key, wishlist] of detailMatches) {
    if (wishlist) return { key, wishlist };
  }

  return undefined;
}

function isFullWishlistPayload(payload: unknown, wishlistId: string): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  const id = String(record.id ?? record._id ?? '');
  return id === wishlistId && Array.isArray(record.items);
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
      // Prefer a full wishlist payload; if the API still returns only an item, refetch.
      if (isFullWishlistPayload(updated, targetId)) {
        return normalizeWishlist(updated);
      }
      return normalizeWishlist(await customersApi.getWishlist(targetId));
    },
    onMutate: async ({ productId, variantId, wishlistId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
      const cached = findCachedWishlist(queryClient, wishlistId);
      if (!cached)
        return {
          previous: undefined as NormalizedWishlist | undefined,
          key: undefined as readonly unknown[] | undefined,
        };

      const { key, wishlist: previous } = cached;
      await queryClient.cancelQueries({ queryKey: key });

      const optimisticItem: EnrichedWishlistItem = {
        id: `optimistic-${productId}`,
        productId,
        variantId,
        productName: 'Adding…',
      };
      queryClient.setQueryData(key, {
        ...previous,
        items: [...previous.items, optimisticItem],
        itemCount: previous.items.length + 1,
      });

      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (wishlist) => {
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist(wishlist.id), wishlist);
      // Keep the provisional 'default' detail cache in sync while list metadata refreshes.
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), wishlist);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishlistId, itemId }: { wishlistId: string; itemId: string }) => {
      const updated = await customersApi.removeWishlistItem(wishlistId, itemId);
      if (isFullWishlistPayload(updated, wishlistId)) {
        return normalizeWishlist(updated);
      }
      return normalizeWishlist(await customersApi.getWishlist(wishlistId));
    },
    onMutate: async ({ wishlistId, itemId }) => {
      const cached = findCachedWishlist(queryClient, wishlistId);
      const key = cached?.key ?? QUERY_KEYS.customers.wishlist(wishlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = cached?.wishlist ?? queryClient.getQueryData<NormalizedWishlist>(key);

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
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), wishlist);
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
