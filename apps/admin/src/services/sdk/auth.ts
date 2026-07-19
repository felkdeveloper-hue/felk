import { http } from '@/lib/http-client';
import { normalizeAuthUser } from '@/utils/normalize-user';
import type { AuthSession, AuthUser } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const raw = await http.post<{
      accessToken: string;
      refreshToken: string;
      user: unknown;
    }>('/auth/login', { ...payload, portal: 'admin' });
    return {
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      user: normalizeAuthUser(raw.user),
    };
  },

  async me(): Promise<AuthUser> {
    const raw = await http.get<unknown>('/auth/me');
    return normalizeAuthUser(raw);
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },
};
