import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { ROUTES } from '@/constants';
import { LoadingLayout } from '@/layouts';
import { useAuthStore } from '@/store';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guards authenticated-only route trees (account, checkout, orders).
 * Redirects to login once the persisted session has hydrated and no user is present.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));

  useEffect(() => {
    if (hasHydrated && !isAuthed && !pathname.startsWith('/auth')) {
      navigate({
        to: ROUTES.authLogin,
        search: { redirect: pathname },
      });
    }
  }, [hasHydrated, isAuthed, navigate, pathname]);

  if (!hasHydrated) {
    return <LoadingLayout />;
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}
