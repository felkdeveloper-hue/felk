import { useAuthContext } from '@/contexts/auth-context';

/** Shorthand for permission checks in feature components. */
export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasRole, hasAnyRole, user } = useAuthContext();
  return {
    user,
    can: hasPermission,
    canAny: hasAnyPermission,
    isRole: hasRole,
    isAnyRole: hasAnyRole,
  };
}
