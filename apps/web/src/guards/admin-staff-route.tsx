import type { ReactNode } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { ADMIN_ROUTES, ROUTES, STAFF_ROLES } from '@/constants';
import { useAuthStore } from '@/store';

/**
 * Guards all /admin/* routes.
 * Redirects unauthenticated users to login.
 * Redirects authenticated non-staff users to /admin/forbidden.
 */
export function AdminStaffRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading session…
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to={ROUTES.authLogin} search={{ redirect: location.href }} />;
  }

  const isStaff = user.roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
  if (!isStaff) {
    return <Navigate to={ADMIN_ROUTES.forbidden} />;
  }

  return <>{children}</>;
}
