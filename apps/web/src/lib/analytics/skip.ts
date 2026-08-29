import { useAuthStore } from '@/store/auth-store';
import { isStaffUser } from '@/utils/auth-redirect';
import { STAFF_ROLES } from '@/constants/admin-permissions';

/** Admin panel routes — do not collect storefront analytics. */
export function isAdminAnalyticsPath(path?: string | null): boolean {
  if (!path) return false;
  const bare = path.split('?')[0] ?? '';
  return bare === '/admin' || bare.startsWith('/admin/');
}

function isStaffFromAuthStore(): boolean {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    if (isStaffUser(user)) return true;
    const roleKey = typeof user.roleKey === 'string' ? user.roleKey : null;
    if (roleKey && (STAFF_ROLES as readonly string[]).includes(roleKey)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Skip collect for admin UI paths and logged-in staff/admin users.
 * Guests and customers are tracked normally. Refresh does not create a new
 * visitor cookie — getVisitorId() reuses the same ID for 365 days.
 */
export function shouldSkipAnalyticsCollect(path?: string | null): boolean {
  const resolved = path ?? (typeof window !== 'undefined' ? window.location.pathname : null);
  if (isAdminAnalyticsPath(resolved)) return true;
  return isStaffFromAuthStore();
}
