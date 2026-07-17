import { useEffect, type ReactNode } from 'react';
import { LoadingLayout } from '@/layouts';
import { authApi } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { normalizeAuthUser } from '@/utils/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Waits for the persisted auth session to rehydrate from storage before
 * rendering the app (avoids a flash of "logged out" UI), then silently
 * re-validates the session against `/auth/me` in the background.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;

    authApi
      .me()
      .then((user) => setUser(normalizeAuthUser(user)))
      .catch(() => clearSession());
    // Only re-validate when the token identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, accessToken]);

  if (!hasHydrated) {
    return <LoadingLayout />;
  }

  return <>{children}</>;
}
