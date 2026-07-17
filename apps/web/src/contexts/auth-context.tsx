import { useAuthStore } from '@/store/auth-store';

/**
 * Context-style hook over the persisted auth store.
 * Prefer this in components; use `useAuthStore` directly only in
 * interceptors or non-React modules.
 */
export function useAuthContext() {
  return useAuthStore((state) => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    hasHydrated: state.hasHydrated,
    isAuthenticated: Boolean(state.accessToken && state.user),
    setSession: state.setSession,
    setTokens: state.setTokens,
    setUser: state.setUser,
    clearSession: state.clearSession,
    hasRole: state.hasRole,
    hasAnyRole: state.hasAnyRole,
    hasPermission: state.hasPermission,
    hasAnyPermission: state.hasAnyPermission,
  }));
}
