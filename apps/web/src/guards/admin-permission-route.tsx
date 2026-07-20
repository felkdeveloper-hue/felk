import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { useAuthStore } from '@/store';

interface AdminPermissionRouteProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
}

/**
 * Gates an admin page by RBAC permissions.
 * Renders children when the user has at least one (or all, if requireAll) of the given permissions.
 */
export function AdminPermissionRoute({
  permissions,
  requireAll = false,
  children,
}: AdminPermissionRouteProps) {
  const permissionsHydrated = useAuthStore((state) => state.permissionsHydrated);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!permissionsHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        Loading permissions…
      </div>
    );
  }

  const allowed = requireAll
    ? permissions.every((permission) => hasPermission(permission))
    : hasAnyPermission(permissions);

  if (!allowed) {
    return <Navigate to={ADMIN_ROUTES.forbidden} />;
  }

  return <>{children}</>;
}
