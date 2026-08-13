import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, customersApi } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { normalizeAuthUser } from '@/utils/auth';
import { QUERY_KEYS } from '@/constants/query-keys';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { AppError } from '@/lib/errors';
import { getDefaultWishlist, normalizeWishlist } from '@/utils/wishlist';
import {
  mergeGuestWishlistOnLogin,
  useWishlistMergeOnLogin,
} from '@/hooks/wishlist/use-wishlist-queries';

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

  useWishlistMergeOnLogin();

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
      .catch((error) => {
        // API blips / deploys / timeouts must not force a logout.
        if (AppError.isAppError(error) && error.isUnauthorized) {
          clearSession();
        }
      });
    // Only re-validate when the token identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, accessToken]);

  // Keep tokens in sync across tabs so refresh-token rotation does not log everyone out.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.authSession) return;
      if (!event.newValue) {
        useAuthStore.getState().clearSession();
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as {
          state?: { user?: unknown; accessToken?: string | null; refreshToken?: string | null };
        };
        const next = parsed.state;
        if (!next) return;
        useAuthStore.setState({
          user: (next.user as ReturnType<typeof useAuthStore.getState>['user']) ?? null,
          accessToken: next.accessToken ?? null,
          refreshToken: next.refreshToken ?? null,
        });
      } catch {
        /* ignore corrupt storage */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Prefetch server wishlist + merge any guest saves after sign-in.
  useEffect(() => {
    if (!hasHydrated || !accessToken) return;

    void queryClient
      .prefetchQuery({
        queryKey: QUERY_KEYS.customers.wishlist('default'),
        queryFn: async () => {
          const wishlists = await customersApi.listWishlists();
          queryClient.setQueryData(QUERY_KEYS.customers.wishlists(), wishlists);
          const defaultWishlist = getDefaultWishlist(wishlists);
          if (!defaultWishlist?.id) {
            const created = await customersApi.createWishlist('My Wishlist');
            if (!created?.id) return null;
            const full = normalizeWishlist(await customersApi.getWishlist(created.id));
            queryClient.setQueryData(QUERY_KEYS.customers.wishlist(created.id), full);
            return full;
          }
          if (!defaultWishlist.id) return null;
          const full = normalizeWishlist(await customersApi.getWishlist(defaultWishlist.id));
          queryClient.setQueryData(QUERY_KEYS.customers.wishlist(defaultWishlist.id), full);
          return full;
        },
        staleTime: 1000 * 60 * 10,
      })
      .then(() => mergeGuestWishlistOnLogin(queryClient))
      .catch(() => {
        /* wishlist warm-up is best-effort */
      });
  }, [accessToken, hasHydrated, queryClient]);

  return <>{children}</>;
}
