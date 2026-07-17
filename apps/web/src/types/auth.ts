export type UserRole = 'customer' | 'admin' | 'super_admin' | 'editor' | 'support' | string;

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  roles: UserRole[];
  permissions: string[];
  isEmailVerified?: boolean;
  sessionId?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: 'Bearer';
  expiresIn?: number;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterResult {
  user: AuthUser;
  message: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}
