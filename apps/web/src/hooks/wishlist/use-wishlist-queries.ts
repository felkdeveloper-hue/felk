import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { customersApi, cartApi, type CartView, type Wishlist } from '@/services/sdk';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store';
import { toGuestWishlistView, useWishlistStore } from '@/store/wishlist-store';
import { getDefaultWishlist, normalizeWishlist, type EnrichedWishlistItem } from '@/utils/wishlist';

const WISHLIST_STALE_MS = 1000 * 60 * 10;

function useIsAuthed() {
  return useAuthStore((state) => Boolean(state.accessToken && state.user));
}

function isAuthedNow() {
  const state = useAuthStore.getState();
  return Boolean(state.accessToken && state.user);
}

type NormalizedWishlist = {
  id: string;
  name: string;
  isDefault?: boolean;
  shareToken?: string;
  itemCount?: number;
  items: EnrichedWishlistItem[];
};

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

async function loadDefaultWishlist(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<NormalizedWishlist> {
  const wishlists = await customersApi.listWishlists();
  queryClient.setQueryData(QUERY_KEYS.customers.wishlists(), wishlists);

  let defaultId = getDefaultWishlist(wishlists)?.id;
  if (!defaultId) {
    const created = await customersApi.createWishlist('My Wishlist');
    defaultId = created.id;
    queryClient.setQueryData(QUERY_KEYS.customers.wishlists(), [...wishlists, created]);
  }

  const full = normalizeWishlist(await customersApi.getWishlist(defaultId));
  syncWishlistCaches(queryClient, full);
  return full;
}

async function resolveDefaultWishlistId(
  queryClient: ReturnType<typeof useQueryClient>,
  wishlistId?: string,
): Promise<string> {
  if (wishlistId && wishlistId !== 'default' && wishlistId !== 'guest') return wishlistId;

  const cached = findCachedWishlist(queryClient, 'default')?.wishlist;
  if (cached?.id && cached.id !== 'default' && cached.id !== 'guest') return cached.id;

  const wishlists =
    queryClient.getQueryData<Wishlist[]>(QUERY_KEYS.customers.wishlists()) ??
    (await customersApi.listWishlists());
  queryClient.setQueryData(QUERY_KEYS.customers.wishlists(), wishlists);

  const existing = getDefaultWishlist(wishlists)?.id;
  if (existing) return existing;

  const created = await customersApi.createWishlist('My Wishlist');
  return created.id;
}

/** Push local guest saves into the signed-in server wishlist, then clear local. */
export async function mergeGuestWishlistOnLogin(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const guestItems = useWishlistStore.getState().items;
  if (!guestItems.length || !isAuthedNow()) return;

  try {
    const targetId = await resolveDefaultWishlistId(queryClient);
    await Promise.all(
      guestItems.map((item) =>
        customersApi
          .addWishlistItem(targetId, {
            productId: item.productId,
            variantId: item.variantId,
          })
          .catch(() => {
            /* already saved or race — ignore */
          }),
      ),
    );
    useWishlistStore.getState().clear();
    const full = normalizeWishlist(await customersApi.getWishlist(targetId));
    syncWishlistCaches(queryClient, full);
  } catch {
    /* keep guest items if merge fails */
  }
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

/** Works signed-out (local) and signed-in (API). */
export function useDefaultWishlistQuery() {
  const isAuthed = useIsAuthed();
  const guestItems = useWishlistStore((state) => state.items);
  const queryClient = useQueryClient();

  const serverQuery = useQuery({
    queryKey: QUERY_KEYS.customers.wishlist('default'),
    queryFn: () => loadDefaultWishlist(queryClient),
    enabled: isAuthed,
    staleTime: WISHLIST_STALE_MS,
  });

  if (!isAuthed) {
    const data = toGuestWishlistView(guestItems);
    return {
      ...serverQuery,
      data,
      error: null,
      isError: false,
      isLoading: false,
      isPending: false,
      isFetching: false,
      isSuccess: true,
      status: 'success' as const,
      refetch: async () =>
        ({
          data,
          error: null,
          isError: false,
          isSuccess: true,
          status: 'success',
        }) as never,
    };
  }

  return serverQuery;
}

export function useWishlistItemCountQuery() {
  const isAuthed = useIsAuthed();
  const guestCount = useWishlistStore((state) => state.items.length);
  const wishlistQuery = useDefaultWishlistQuery();

  if (!isAuthed) {
    return {
      ...wishlistQuery,
      data: guestCount,
    };
  }

  return {
    ...wishlistQuery,
    data: wishlistQuery.data?.itemCount ?? wishlistQuery.data?.items.length ?? 0,
  };
}

export function useIsInWishlist(productId?: string, variantId?: string) {
  const isAuthed = useIsAuthed();
  const guestHas = useWishlistStore((state) =>
    productId ? state.hasItem(productId, variantId) : false,
  );
  const wishlistQuery = useDefaultWishlistQuery();

  if (!isAuthed) return guestHas;

  const items = wishlistQuery.data?.items ?? [];
  return items.some(
    (item) => item.productId === productId && (variantId ? item.variantId === variantId : true),
  );
}

type AddWishlistVars = {
  productId: string;
  variantId?: string;
  wishlistId?: string;
  productName?: string;
  productSlug?: string;
  thumbnailUrl?: string;
  price?: EnrichedWishlistItem['price'];
};

function mergeWishlistEnrichment(
  wishlist: NormalizedWishlist,
  previous: NormalizedWishlist | undefined,
  vars: AddWishlistVars,
): NormalizedWishlist {
  return {
    ...wishlist,
    items: wishlist.items.map((item) => {
      if (item.productName && item.productName !== 'Saved' && item.thumbnailUrl) return item;
      const fromPrev = previous?.items.find((entry) => entry.productId === item.productId);
      const fromVars = vars.productId === item.productId ? vars : undefined;
      return {
        ...item,
        productName:
          item.productName && item.productName !== 'Saved'
            ? item.productName
            : (fromPrev?.productName ?? fromVars?.productName ?? item.productName),
        productSlug: item.productSlug ?? fromPrev?.productSlug ?? fromVars?.productSlug,
        thumbnailUrl: item.thumbnailUrl ?? fromPrev?.thumbnailUrl ?? fromVars?.thumbnailUrl,
        price: item.price ?? fromPrev?.price ?? fromVars?.price,
        variantId: item.variantId ?? fromPrev?.variantId ?? fromVars?.variantId,
        variantTitle: item.variantTitle ?? fromPrev?.variantTitle,
        variantSku: item.variantSku ?? fromPrev?.variantSku,
      };
    }),
  };
}

export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: AddWishlistVars) => {
      if (!isAuthedNow()) {
        useWishlistStore.getState().addItem({
          productId: vars.productId,
          variantId: vars.variantId,
          productName: vars.productName,
          productSlug: vars.productSlug,
          thumbnailUrl: vars.thumbnailUrl,
          price: vars.price,
        });
        return toGuestWishlistView(useWishlistStore.getState().items);
      }

      const targetId = await resolveDefaultWishlistId(queryClient, vars.wishlistId);
      try {
        const updated = await customersApi.addWishlistItem(targetId, {
          productId: vars.productId,
          variantId: vars.variantId,
        });
        if (isFullWishlistPayload(updated, targetId)) {
          return normalizeWishlist(updated);
        }
        return normalizeWishlist(await customersApi.getWishlist(targetId));
      } catch {
        return normalizeWishlist(await customersApi.getWishlist(targetId));
      }
    },
    onMutate: async (vars: AddWishlistVars) => {
      if (!isAuthedNow()) {
        // Store already updated in mutationFn; mirror for instant hearts before settle.
        useWishlistStore.getState().addItem({
          productId: vars.productId,
          variantId: vars.variantId,
          productName: vars.productName,
          productSlug: vars.productSlug,
          thumbnailUrl: vars.thumbnailUrl,
          price: vars.price,
        });
        return { previous: undefined, key: QUERY_KEYS.customers.wishlist('default') };
      }

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.wishlists() });
      const cached = findCachedWishlist(queryClient, vars.wishlistId);
      const key = cached?.key ?? QUERY_KEYS.customers.wishlist('default');
      await queryClient.cancelQueries({ queryKey: key });

      const previous = cached?.wishlist;
      const base: NormalizedWishlist = previous ?? {
        id: vars.wishlistId && vars.wishlistId !== 'default' ? vars.wishlistId : 'default',
        name: 'My Wishlist',
        items: [],
        itemCount: 0,
        isDefault: true,
      };

      const already = base.items.some(
        (item) =>
          item.productId === vars.productId &&
          (vars.variantId ? item.variantId === vars.variantId : true),
      );
      if (already) return { previous, key };

      const optimisticItem: EnrichedWishlistItem = {
        id: `optimistic-${vars.productId}-${vars.variantId ?? 'any'}`,
        productId: vars.productId,
        variantId: vars.variantId,
        productName: vars.productName ?? 'Product',
        productSlug: vars.productSlug,
        thumbnailUrl: vars.thumbnailUrl,
        price: vars.price,
      };
      const next = {
        ...base,
        items: [...base.items, optimisticItem],
        itemCount: base.items.length + 1,
      };
      queryClient.setQueryData(key, next);
      queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), next);

      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (!isAuthedNow()) return;
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
        queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), context.previous);
      } else if (context?.key) {
        queryClient.removeQueries({ queryKey: context.key });
      }
    },
    onSuccess: (wishlist, variables, context) => {
      if (!isAuthedNow()) return;
      syncWishlistCaches(
        queryClient,
        mergeWishlistEnrichment(wishlist, context?.previous, variables),
      );
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
      if (!isAuthedNow()) {
        useWishlistStore.getState().removeItem({ itemId, productId, variantId });
        return toGuestWishlistView(useWishlistStore.getState().items);
      }

      let targetWishlistId =
        wishlistId === 'default' || wishlistId === 'guest' ? undefined : wishlistId;
      let targetItemId = itemId;

      const cached = findCachedWishlist(queryClient, wishlistId)?.wishlist;
      if ((!targetWishlistId || targetItemId.startsWith('optimistic-')) && cached) {
        if (cached.id && cached.id !== 'default' && cached.id !== 'guest') {
          targetWishlistId = cached.id;
        }
        const match = cached.items.find(
          (item) =>
            item.id === itemId ||
            (productId &&
              item.productId === productId &&
              (variantId ? item.variantId === variantId : true)),
        );
        if (match && !match.id.startsWith('optimistic-')) {
          targetItemId = match.id;
        }
      }

      if (!targetWishlistId || targetItemId.startsWith('optimistic-')) {
        targetWishlistId = await resolveDefaultWishlistId(queryClient, targetWishlistId);
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
      if (!isAuthedNow()) {
        useWishlistStore.getState().removeItem({ itemId, productId, variantId });
        return { previous: undefined, key: QUERY_KEYS.customers.wishlist('default') };
      }

      const cached = findCachedWishlist(queryClient, wishlistId);
      const key = cached?.key ?? QUERY_KEYS.customers.wishlist('default');
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
      if (!isAuthedNow()) return;
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
        queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), context.previous);
      }
    },
    onSuccess: (wishlist) => {
      if (!isAuthedNow()) return;
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
        throw new Error('Select a size/color on the product page first');
      }

      const cart = await cartApi.addItem({ variantId: item.variantId, quantity: 1 });

      if (!isAuthedNow()) {
        useWishlistStore.getState().removeItem({
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
        });
        return cart;
      }

      let targetWishlistId =
        wishlistId === 'default' || wishlistId === 'guest' ? undefined : wishlistId;
      let targetItemId = item.id;
      if (!targetWishlistId || targetItemId.startsWith('optimistic-')) {
        targetWishlistId = await resolveDefaultWishlistId(queryClient, targetWishlistId);
        if (targetItemId.startsWith('optimistic-')) {
          const current = await customersApi.getWishlist(targetWishlistId);
          const match = current.items.find(
            (entry) =>
              entry.productId === item.productId &&
              (item.variantId ? entry.variantId === item.variantId : true),
          );
          if (match) targetItemId = match.id;
        }
      }

      if (targetWishlistId && !targetItemId.startsWith('optimistic-')) {
        await customersApi.removeWishlistItem(targetWishlistId, targetItemId).catch(() => {
          /* cart already has the item */
        });
      }

      return cart;
    },
    onMutate: async ({ wishlistId, item }) => {
      if (!isAuthedNow()) {
        useWishlistStore.getState().removeItem({
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
        });
      } else {
        const cached = findCachedWishlist(queryClient, wishlistId);
        const key = cached?.key ?? QUERY_KEYS.customers.wishlist('default');
        await queryClient.cancelQueries({ queryKey: key });
        const previousWishlist =
          cached?.wishlist ?? queryClient.getQueryData<NormalizedWishlist>(key);
        if (previousWishlist) {
          const nextItems = previousWishlist.items.filter((entry) => entry.id !== item.id);
          const nextWishlist = {
            ...previousWishlist,
            items: nextItems,
            itemCount: Math.max(0, nextItems.length),
          };
          queryClient.setQueryData(key, nextWishlist);
          queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), nextWishlist);
        }
      }

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cart.current() });
      const previousCart =
        queryClient.getQueryData<CartView>(QUERY_KEYS.cart.current()) ??
        useCartStore.getState().cart;

      if (item.variantId && previousCart) {
        const qty = 1;
        const unitPrice = item.price?.amount ?? 0;
        const existing = previousCart.items.find((line) => line.variantId === item.variantId);
        const nextItems = existing
          ? previousCart.items.map((line) =>
              line.variantId === item.variantId
                ? {
                    ...line,
                    quantity: line.quantity + qty,
                    totalPrice: line.unitPrice * (line.quantity + qty),
                  }
                : line,
            )
          : [
              ...previousCart.items,
              {
                id: `optimistic-${item.variantId}`,
                productId: item.productId,
                productSlug: item.productSlug,
                variantId: item.variantId,
                name: item.productName ?? 'Product',
                quantity: qty,
                unitPrice,
                totalPrice: unitPrice * qty,
                imageUrl: item.thumbnailUrl,
                currency: item.price?.currency ?? 'LKR',
                inStock: true,
              },
            ];
        const subtotal = nextItems.reduce((sum, line) => sum + line.totalPrice, 0);
        const optimisticCart: CartView = {
          ...previousCart,
          items: nextItems,
          totals: {
            ...previousCart.totals,
            subtotal,
            total: subtotal + (previousCart.totals.shipping ?? 0),
            itemCount: nextItems.length,
            totalQuantity: nextItems.reduce((sum, line) => sum + line.quantity, 0),
          },
        };
        queryClient.setQueryData(QUERY_KEYS.cart.current(), optimisticCart);
        useCartStore.getState().setCart(optimisticCart);
      }

      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(QUERY_KEYS.cart.current(), context.previousCart);
        useCartStore.getState().setCart(context.previousCart);
      }
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      useCartStore.getState().setCart(cart);
    },
  });
}

/** Merge guest saves after login — mount once near auth. */
export function useWishlistMergeOnLogin() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;
    void mergeGuestWishlistOnLogin(queryClient);
  }, [accessToken, hasHydrated, queryClient]);
}

export type { Wishlist };
