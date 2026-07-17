import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { ROUTES } from '@/constants';
import { LoadingLayout } from '@/layouts';
import { useAuthStore } from '@/store';

interface GuestRouteProps {
  children: ReactNode;
}

/**
 * Guards guest-only route trees (e.g. `/auth`). Redirects already
 * authenticated users to their account instead of showing login/register.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const navigate = useNavigate();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));

  useEffect(() => {
    if (hasHydrated && isAuthed) {
      navigate({ to: ROUTES.account });
    }
  }, [hasHydrated, isAuthed, navigate]);

  if (!hasHydrated) {
    return <LoadingLayout />;
  }

  if (isAuthed) {
    return null;
  }

  return <>{children}</>;
}
