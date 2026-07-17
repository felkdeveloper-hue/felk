import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { zustandStorage } from '@/lib/storage';
import type { AuthSession, AuthTokens, AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
}

interface AuthActions {
  setSession: (session: AuthSession) => void;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  setHasHydrated: (hydrated: boolean) => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),

      setTokens: (tokens) =>
        set((state) => ({
          accessToken: tokens.accessToken ?? state.accessToken,
          refreshToken: tokens.refreshToken ?? state.refreshToken,
        })),

      setUser: (user) => set({ user }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      hasRole: (role) => Boolean(get().user?.roles.includes(role)),
      hasAnyRole: (roles) => roles.some((role) => get().user?.roles.includes(role)),
      hasPermission: (permission) => Boolean(get().user?.permissions.includes(permission)),
      hasAnyPermission: (permissions) =>
        permissions.some((permission) => get().user?.permissions.includes(permission)),
    }),
    {
      name: STORAGE_KEYS.authSession,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export function isAuthenticated(state: AuthStore): boolean {
  return Boolean(state.accessToken && state.user);
}
