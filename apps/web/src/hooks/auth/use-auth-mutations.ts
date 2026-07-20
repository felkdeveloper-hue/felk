import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { QUERY_KEYS } from '@/constants/query-keys';
import { ADMIN_ROUTES, ROUTES } from '@/constants/routes';
import { STAFF_ROLES } from '@/constants/admin-permissions';
import { getAuthRedirectTarget, buildVerifyEmailSearch } from '@/utils/auth-redirect';
import { AppError } from '@/lib/errors';
import { authApi } from '@/services/sdk';
import { useAuthStore } from '@/store';
import type { LoginPayload } from '@/types';

export interface LoginMutationInput extends LoginPayload {
  redirect?: string;
}

export function useLoginMutation() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: ({ redirect: _redirect, ...payload }: LoginMutationInput) => authApi.login(payload),
    onSuccess: (session, variables) => {
      setSession(session);
      const isStaff = session.user.roles.some((role) =>
        (STAFF_ROLES as readonly string[]).includes(role),
      );
      if (isStaff) {
        navigate({ to: ADMIN_ROUTES.dashboard });
      } else {
        navigate({ to: getAuthRedirectTarget(variables.redirect) });
      }
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => {
      navigate({
        to: ROUTES.authVerifyEmail,
        search: buildVerifyEmailSearch({
          email: result.user.email,
          pending: true,
          devVerificationUrl: result.devVerificationUrl,
        }),
      });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      navigate({ to: ROUTES.authLogin, search: { reset: true } });
    },
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (email: string) => authApi.resendVerification(email),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: authApi.changePassword,
  });
}

export function useLogoutMutation() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate({ to: ROUTES.authLogin });
    },
  });
}

export function useLogoutAllMutation() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate({ to: ROUTES.authLogin });
    },
  });
}

export function useAuthMeQuery() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: QUERY_KEYS.auth.me(),
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    enabled: Boolean(accessToken),
    staleTime: 1000 * 60 * 5,
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (AppError.isAppError(error)) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      return 'Please verify your email before signing in.';
    }
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Invalid email or password.';
    }
    if (error.code === 'ACCOUNT_LOCKED') {
      return 'Your account is temporarily locked. Try again later.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
