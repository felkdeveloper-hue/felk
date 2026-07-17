import type { ReactNode } from 'react';
import { useAuthStore } from '@/store';

interface RoleGuardProps {
  /** Role key(s) required to render `children`. */
  role: string | string[];
  /** If true, all roles are required. Defaults to "any". */
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally renders content based on the current user's role(s). */
export function RoleGuard({ role, requireAll = false, children, fallback = null }: RoleGuardProps) {
  const roles = Array.isArray(role) ? role : [role];

  const hasAccess = useAuthStore((state) => {
    const userRoles = state.user?.roles ?? [];
    return requireAll
      ? roles.every((r) => userRoles.includes(r))
      : roles.some((r) => userRoles.includes(r));
  });

  return <>{hasAccess ? children : fallback}</>;
}
