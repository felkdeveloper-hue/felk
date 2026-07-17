import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { authApi, type LoginPayload } from '@/services';
import { useAuthStore } from '@/store';

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
    staleTime: 1000 * 60,
  });
}

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (session) => setSession(session),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
