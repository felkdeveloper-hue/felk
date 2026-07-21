import { ADMIN_ROUTES, ROUTES } from '@/constants';
import { STAFF_ROLES } from '@/constants/admin-permissions';
import type { AuthUser } from '@/types';

export function isStaffUser(user: Pick<AuthUser, 'roles'> | null | undefined): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
}

/** Destination after login / when a guest route sees an already-authed session. */
export function getPostLoginDestination(
  user: Pick<AuthUser, 'roles'> | null | undefined,
  redirect?: string,
): string {
  if (isStaffUser(user)) {
    return ADMIN_ROUTES.dashboard;
  }
  return getAuthRedirectTarget(redirect);
}

/** Safe post-auth destination from a `?redirect=` query param. */
export function getAuthRedirectTarget(redirect?: string): string {
  if (
    redirect &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//') &&
    !redirect.startsWith('/auth')
  ) {
    return redirect;
  }
  return ROUTES.home;
}

export function parseAuthRedirectSearch(search: Record<string, unknown>) {
  return {
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  };
}

export function parseLoginSearch(search: Record<string, unknown>) {
  return {
    ...parseAuthRedirectSearch(search),
    reset: search.reset === true || search.reset === 'true',
  };
}

export type VerifyEmailSearch = {
  token?: string;
  email?: string;
  pending?: boolean;
  devVerificationUrl?: string;
};

export function buildVerifyEmailSearch(search: Partial<VerifyEmailSearch> = {}): VerifyEmailSearch {
  return {
    token: search.token,
    email: search.email,
    pending: search.pending,
    devVerificationUrl: search.devVerificationUrl,
  };
}
