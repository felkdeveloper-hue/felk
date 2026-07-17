import type { ReactNode } from 'react';
import { useAuthStore } from '@/store';

interface PermissionGuardProps {
  /** Permission key(s) required to render `children`. */
  permission: string | string[];
  /** If true, all permissions are required. Defaults to "any". */
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally renders content based on the current user's permissions. */
export function PermissionGuard({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = useAuthStore((state) => {
    const userPermissions = state.user?.permissions ?? [];
    return requireAll
      ? permissions.every((p) => userPermissions.includes(p))
      : permissions.some((p) => userPermissions.includes(p));
  });

  return <>{hasAccess ? children : fallback}</>;
}
