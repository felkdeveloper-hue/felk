import { useAuthStore } from '@/store/auth-store';
import { isStaffUser } from '@/utils/auth-redirect';

/** Admin panel routes — do not collect storefront analytics. */
export function isAdminAnalyticsPath(path?: string | null): boolean {
  if (!path) return false;
  const bare = path.split('?')[0] ?? '';
  return bare === '/admin' || bare.startsWith('/admin/');
}

/**
 * Skip collect for admin UI paths and logged-in staff/admin users.
 * Guests and customers are tracked normally.
 */
export function shouldSkipAnalyticsCollect(path?: string | null): boolean {
  const resolved = path ?? (typeof window !== 'undefined' ? window.location.pathname : null);
  if (isAdminAnalyticsPath(resolved)) return true;
  try {
    if (isStaffUser(useAuthStore.getState().user)) return true;
  } catch {
    /* store not ready */
  }
  return false;
}
