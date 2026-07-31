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
  email?: string;
  pending?: boolean;
};

const DEV_VERIFY_CODE_KEY = 'fe_dev_verification_code';

export function stashDevVerificationCode(code?: string): void {
  if (typeof window === 'undefined') return;
  if (code) {
    sessionStorage.setItem(DEV_VERIFY_CODE_KEY, code);
  } else {
    sessionStorage.removeItem(DEV_VERIFY_CODE_KEY);
  }
}

export function takeDevVerificationCode(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const code = sessionStorage.getItem(DEV_VERIFY_CODE_KEY) ?? undefined;
  if (code) sessionStorage.removeItem(DEV_VERIFY_CODE_KEY);
  return code;
}

export function buildVerifyEmailSearch(search: Partial<VerifyEmailSearch> = {}): VerifyEmailSearch {
  return {
    email: search.email,
    pending: search.pending,
  };
}
