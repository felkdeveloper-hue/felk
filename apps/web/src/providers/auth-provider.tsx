import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, customersApi } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { normalizeAuthUser } from '@/utils/auth';
import { QUERY_KEYS } from '@/constants/query-keys';
import { getDefaultWishlist, normalizeWishlist } from '@/utils/wishlist';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Rehydrates the persisted auth session in the background so the storefront
 * can paint immediately (avoids a blank loading shell on every visit).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  // Failsafe: never leave auth stuck unhydrated if persist stalls.
  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => {
      if (!useAuthStore.getState().hasHydrated) {
        useAuthStore.getState().setHasHydrated(true);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;

    authApi
      .me()
      .then((user) => setUser(normalizeAuthUser(user)))
      .catch(() => clearSession());
    // Only re-validate when the token identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, accessToken]);

  // Prefetch wishlist so hearts paint filled without waiting on first click.
  useEffect(() => {
    if (!hasHydrated || !accessToken) return;

    void queryClient
      .prefetchQuery({
        queryKey: QUERY_KEYS.customers.wishlists(),
        queryFn: () => customersApi.listWishlists(),
        staleTime: 1000 * 60 * 10,
      })
      .then(async () => {
        const wishlists = queryClient.getQueryData<
          Awaited<ReturnType<typeof customersApi.listWishlists>>
        >(QUERY_KEYS.customers.wishlists());
        const defaultWishlist = wishlists ? getDefaultWishlist(wishlists) : undefined;
        if (!defaultWishlist?.id) return;
        await queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.customers.wishlist(defaultWishlist.id),
          queryFn: async () =>
            normalizeWishlist(await customersApi.getWishlist(defaultWishlist.id)),
          staleTime: 1000 * 60 * 10,
        });
        const detail = queryClient.getQueryData(QUERY_KEYS.customers.wishlist(defaultWishlist.id));
        if (detail) {
          queryClient.setQueryData(QUERY_KEYS.customers.wishlist('default'), detail);
        }
      })
      .catch(() => {
        /* wishlist warm-up is best-effort */
      });
  }, [accessToken, hasHydrated, queryClient]);

  return <>{children}</>;
}
