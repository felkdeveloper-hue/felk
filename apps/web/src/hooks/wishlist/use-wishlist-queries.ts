import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { customersApi, cartApi, type Wishlist } from '@/services/sdk';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store';
import { getDefaultWishlist, normalizeWishlist, type EnrichedWishlistItem } from '@/utils/wishlist';

const WISHLIST_STALE_MS = 1000 * 60 * 10;

function useIsAuthed() {
  return useAuthStore((state) => Boolean(state.accessToken && state.user));
}

export function useWishlistsQuery() {
  const isAuthed = useIsAuthed();

  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlists(),
    queryFn: () => customersApi.listWishlists(),
    enabled: isAuthed,
    staleTime: WISHLIST_STALE_MS,
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
    staleTime: WISHLIST_STALE_MS,
  });
}

export function useWishlistItemCountQuery() {
  const isAuthed = useIsAuthed();

  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlists(),
    queryFn: () => customersApi.listWishlists(),
    enabled: isAuthed,
    staleTime: WISHLIST_STALE_MS,
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

function syncWishlistCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  wishlist: NormalizedWishlist,
) {
  queryClient.setQueryData(QUERY_KEYS.customers.wishlist(wishlist.id), wishlist);
  queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), wishlist);
  queryClient.setQueryData(QUERY_KEYS.customers.wishlists(), (prev) => {
    if (!Array.isArray(prev)) {
      return [
        {
          id: wishlist.id,
          name: wishlist.name,
          itemCount: wishlist.itemCount,
          isDefault: true,
        },
      ];
    }
    const exists = prev.some((entry) => entry.id === wishlist.id);
    if (!exists) {
      return [
        ...prev,
        {
          id: wishlist.id,
          name: wishlist.name,
          itemCount: wishlist.itemCount,
          isDefault: true,
        },
      ];
    }
    return prev.map((entry) =>
      entry.id === wishlist.id ? { ...entry, itemCount: wishlist.itemCount } : entry,
    );
  });
}

async function resolveDefaultWishlistId(wishlistId?: string): Promise<string> {
  if (wishlistId && wishlistId !== 'default') return wishlistId;
  const wishlists = await customersApi.listWishlists();
  const existing = getDefaultWishlist(wishlists)?.id;
  if (existing) return existing;
  const created = await customersApi.createWishlist('My Wishlist');
  return created.id;
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
      const targetId = await resolveDefaultWishlistId(wishlistId);
      try {
        const updated = await customersApi.addWishlistItem(targetId, { productId, variantId });
        if (isFullWishlistPayload(updated, targetId)) {
          return normalizeWishlist(updated);
        }
        return normalizeWishlist(await customersApi.getWishlist(targetId));
      } catch {
        // Already in wishlist or race — return current state.
        return normalizeWishlist(await customersApi.getWishlist(targetId));
      }
    },
    onMutate: async ({ productId, variantId, wishlistId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
      const cached = findCachedWishlist(queryClient, wishlistId);
      const key = cached?.key ?? QUERY_KEYS.customers.wishlist(wishlistId ?? 'default');
      await queryClient.cancelQueries({ queryKey: key });

      const previous = cached?.wishlist;
      const base: NormalizedWishlist = previous ?? {
        id: wishlistId && wishlistId !== 'default' ? wishlistId : 'default',
        name: 'My Wishlist',
        items: [],
        itemCount: 0,
        isDefault: true,
      };

      const already = base.items.some(
        (item) => item.productId === productId && (variantId ? item.variantId === variantId : true),
      );
      if (already) return { previous, key };

      const optimisticItem: EnrichedWishlistItem = {
        id: `optimistic-${productId}-${variantId ?? 'any'}`,
        productId,
        variantId,
        productName: 'Saved',
      };
      queryClient.setQueryData(key, {
        ...base,
        items: [...base.items, optimisticItem],
        itemCount: base.items.length + 1,
      });
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), (prev) => {
        if (prev) {
          const list = prev as NormalizedWishlist;
          if (
            list.items.some(
              (item) =>
                item.productId === productId && (variantId ? item.variantId === variantId : true),
            )
          ) {
            return list;
          }
          return {
            ...list,
            items: [...list.items, optimisticItem],
            itemCount: list.items.length + 1,
          };
        }
        return {
          ...base,
          items: [...base.items, optimisticItem],
          itemCount: base.items.length + 1,
        };
      });

      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      } else if (context?.key) {
        queryClient.removeQueries({ queryKey: context.key });
      }
    },
    onSuccess: (wishlist) => {
      syncWishlistCaches(queryClient, wishlist);
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wishlistId,
      itemId,
      productId,
      variantId,
    }: {
      wishlistId: string;
      itemId: string;
      productId?: string;
      variantId?: string;
    }) => {
      // Optimistic-only ids never hit the API — resolve real id from cache/server.
      let targetWishlistId = wishlistId === 'default' ? undefined : wishlistId;
      let targetItemId = itemId;

      if (!targetWishlistId || targetItemId.startsWith('optimistic-')) {
        targetWishlistId = await resolveDefaultWishlistId(targetWishlistId);
        const current = await customersApi.getWishlist(targetWishlistId);
        const match = current.items.find(
          (item) =>
            item.id === itemId ||
            (productId &&
              String(item.productId) === productId &&
              (variantId ? String(item.variantId) === variantId : true)),
        );
        if (!match) {
          return normalizeWishlist(current);
        }
        targetItemId = String(match.id);
      }

      const updated = await customersApi.removeWishlistItem(targetWishlistId, targetItemId);
      if (isFullWishlistPayload(updated, targetWishlistId)) {
        return normalizeWishlist(updated);
      }
      return normalizeWishlist(await customersApi.getWishlist(targetWishlistId));
    },
    onMutate: async ({ wishlistId, itemId, productId, variantId }) => {
      const cached = findCachedWishlist(queryClient, wishlistId);
      const key = cached?.key ?? QUERY_KEYS.customers.wishlist(wishlistId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = cached?.wishlist ?? queryClient.getQueryData<NormalizedWishlist>(key);

      if (previous) {
        const nextItems = previous.items.filter((item) => {
          if (item.id === itemId) return false;
          if (
            productId &&
            item.productId === productId &&
            (variantId ? item.variantId === variantId : true)
          ) {
            return false;
          }
          return true;
        });
        const next = {
          ...previous,
          items: nextItems,
          itemCount: Math.max(0, nextItems.length),
        };
        queryClient.setQueryData(key, next);
        queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), next);
      }

      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (wishlist) => {
      syncWishlistCaches(queryClient, wishlist);
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
