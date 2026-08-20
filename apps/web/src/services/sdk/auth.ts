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
    const raw = await http.post<{
      user: unknown;
      message: string;
      devVerificationCode?: string;
    }>('/auth/register', payload);
    return {
      user: normalizeAuthUser(raw.user),
      message: raw.message,
      ...(raw.devVerificationCode ? { devVerificationCode: raw.devVerificationCode } : {}),
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

  /** Guest checkout — email lookup (exists / verified). */
  checkoutEmailStatus(email: string): Promise<{ exists: boolean; verified: boolean }> {
    return http.post<{ exists: boolean; verified: boolean }>(
      '/auth/checkout/email-status',
      { email },
      { skipAuthRefresh: true, timeout: 12_000 },
    );
  },

  checkoutSendOtp(email: string): Promise<MessageResult & { devVerificationCode?: string }> {
    return http.post<MessageResult & { devVerificationCode?: string }>(
      '/auth/checkout/send-otp',
      { email },
      { skipAuthRefresh: true, timeout: 12_000 },
    );
  },

  async checkoutVerifyOtp(
    email: string,
    otp: string,
  ): Promise<
    | (AuthSession & { mode: 'login' })
    | { mode: 'signup'; signupToken: string; email: string; expiresIn: number; message: string }
  > {
    const raw = await http.post<{
      mode?: string;
      signupToken?: string;
      email?: string;
      expiresIn?: number;
      message?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: unknown;
    }>('/auth/checkout/verify-otp', { email, otp }, { skipAuthRefresh: true, timeout: 15_000 });

    if (raw.mode === 'signup' && raw.signupToken) {
      return {
        mode: 'signup',
        signupToken: raw.signupToken,
        email: raw.email ?? email,
        expiresIn: raw.expiresIn ?? 900,
        message: raw.message ?? 'Email verified',
      };
    }

    return { mode: 'login', ...normalizeAuthSession(raw) };
  },

  async checkoutCompleteSignup(payload: {
    signupToken: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthSession> {
    const raw = await http.post<unknown>('/auth/checkout/complete-signup', payload, {
      skipAuthRefresh: true,
      timeout: 20_000,
    });
    return normalizeAuthSession(raw);
  },

  async checkoutCompleteGuest(payload: {
    signupToken: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthSession> {
    const raw = await http.post<unknown>('/auth/checkout/complete-guest', payload, {
      skipAuthRefresh: true,
      timeout: 20_000,
    });
    return normalizeAuthSession(raw);
  },

  /** One-click guest — no email/OTP; only address is needed next. */
  async checkoutContinueAsGuest(payload?: {
    guestCartToken?: string;
    visitorId?: string;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    referrer?: string | null;
    fbclid?: string | null;
    gclid?: string | null;
    ttclid?: string | null;
    msclkid?: string | null;
    igshid?: string | null;
    inAppSource?: string | null;
    landingPath?: string | null;
  }): Promise<AuthSession> {
    const raw = await http.post<unknown>('/auth/checkout/continue-as-guest', payload ?? {}, {
      skipAuthRefresh: true,
      timeout: 20_000,
    });
    return normalizeAuthSession(raw);
  },
};
