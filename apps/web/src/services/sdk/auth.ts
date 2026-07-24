import { http } from '@/lib/http-client';
import { normalizeAuthSession, normalizeAuthUser } from '@/utils/auth';
import type {
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  MessageResult,
  RegisterPayload,
  RegisterResult,
} from '@/types';

/**
 * Typed SDK for `/auth/*`. Components/hooks should call these methods
 * instead of touching axios directly.
 */
export const authApi = {
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const raw = await http.post<{ user: unknown; message: string }>('/auth/register', payload);
    return {
      user: normalizeAuthUser(raw.user),
      message: raw.message,
    };
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    const raw = await http.post<unknown>('/auth/login', payload);
    return normalizeAuthSession(raw);
  },

  async refresh(refreshToken: string): Promise<AuthSession> {
    const raw = await http.post<unknown>('/auth/refresh', { refreshToken });
    return normalizeAuthSession(raw);
  },

  logout(): Promise<null> {
    return http.post<null>('/auth/logout');
  },

  logoutAll(): Promise<null> {
    return http.post<null>('/auth/logout-all');
  },

  forgotPassword(email: string): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/forgot-password', { email });
  },

  resetPassword(email: string, code: string, password: string): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/reset-password', { email, code, password });
  },

  changePassword(payload: ChangePasswordPayload): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/change-password', payload);
  },

  verifyEmail(email: string, code: string): Promise<AuthSession> {
    return http.post<unknown>('/auth/verify-otp', { email, otp: code }).then(normalizeAuthSession);
  },

  resendVerification(email: string): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/resend-otp', { email });
  },

  sendOtp(email: string): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/send-otp', { email });
  },

  verifyOtp(email: string, otp: string): Promise<AuthSession> {
    return http.post<unknown>('/auth/verify-otp', { email, otp }).then(normalizeAuthSession);
  },

  resendOtp(email: string): Promise<MessageResult> {
    return http.post<MessageResult>('/auth/resend-otp', { email });
  },

  async me(): Promise<AuthUser> {
    const raw = await http.get<unknown>('/auth/me');
    return normalizeAuthUser(raw);
  },
};
