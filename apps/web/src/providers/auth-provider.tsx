import { useEffect, type ReactNode } from 'react';
import { authApi } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { normalizeAuthUser } from '@/utils/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Rehydrates the persisted auth session in the background so the storefront
 * can paint immediately (avoids a blank loading shell on every visit).
 */
export function AuthProvider({ children }: AuthProviderProps) {
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

  return <>{children}</>;
}
