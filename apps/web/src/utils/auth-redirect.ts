import { ROUTES } from '@/constants';

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
  return ROUTES.account;
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
