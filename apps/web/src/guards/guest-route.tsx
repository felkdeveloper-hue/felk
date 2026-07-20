import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { LoadingLayout } from '@/layouts';
import { useAuthStore } from '@/store';
import { getPostLoginDestination } from '@/utils/auth-redirect';

interface GuestRouteProps {
  children: ReactNode;
}

/**
 * Guards guest-only route trees (e.g. `/auth`). Redirects already
 * authenticated users away from login/register.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const navigate = useNavigate();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));

  useEffect(() => {
    if (hasHydrated && isAuthed) {
      navigate({ to: getPostLoginDestination(user) });
    }
  }, [hasHydrated, isAuthed, navigate, user]);

  if (!hasHydrated) {
    return <LoadingLayout />;
  }

  if (isAuthed) {
    return null;
  }

  return <>{children}</>;
}
