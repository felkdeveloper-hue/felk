import { useEffect } from 'react';
import { useAuthMeQuery } from '@/hooks';
import { useAuthStore } from '@/store';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const permissionsHydrated = useAuthStore((state) => state.permissionsHydrated);
  const setPermissionsHydrated = useAuthStore((state) => state.setPermissionsHydrated);
  const me = useAuthMeQuery();

  useEffect(() => {
    if (!accessToken) {
      setPermissionsHydrated(false);
      return;
    }
    if (permissionsHydrated) return;
    if (me.isSuccess || me.isError) {
      setPermissionsHydrated(true);
    }
  }, [accessToken, me.isError, me.isSuccess, permissionsHydrated, setPermissionsHydrated]);

  return <>{children}</>;
}
