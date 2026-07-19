import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';
import { useAuthStore } from '@/store';

interface PermissionRouteProps {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
}

export function PermissionRoute({
  permissions,
  requireAll = false,
  children,
}: PermissionRouteProps) {
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
