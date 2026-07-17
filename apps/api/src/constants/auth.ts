export const USER_STATUS = {
  ACTIVE: 'active',
  INVITED: 'invited',
  LOCKED: 'locked',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const AUTH_PORTAL = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
} as const;

export type AuthPortal = (typeof AUTH_PORTAL)[keyof typeof AUTH_PORTAL];

export const STAFF_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'inventory_manager',
  'marketing_manager',
  'customer_support',
  'finance',
  'warehouse_staff',
] as const;

export const AUTH_COOKIES = {
  ACCESS: 'fe_access_token',
  REFRESH: 'fe_refresh_token',
} as const;

export const AUTH_LIMITS = {
  MAX_FAILED_LOGINS: 5,
  LOCK_DURATION_MINUTES: 30,
  PASSWORD_HISTORY_SIZE: 5,
  PASSWORD_MIN_LENGTH: 8,
  VERIFICATION_TOKEN_HOURS: 24,
  RESET_TOKEN_MINUTES: 30,
  REMEMBER_ME_DAYS: 30,
  DEFAULT_REFRESH_DAYS: 7,
} as const;

export const AUDIT_ACTIONS = {
  USER_REGISTERED: 'auth.registered',
  USER_LOGIN: 'auth.login',
  USER_LOGIN_FAILED: 'auth.login_failed',
  USER_LOGOUT: 'auth.logout',
  USER_LOGOUT_ALL: 'auth.logout_all',
  TOKEN_REFRESH: 'auth.token_refresh',
  TOKEN_REUSE_DETECTED: 'auth.token_reuse',
  PASSWORD_CHANGE: 'auth.password_change',
  PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  PASSWORD_RESET: 'auth.password_reset',
  EMAIL_VERIFICATION_SENT: 'auth.email_verification_sent',
  EMAIL_VERIFIED: 'auth.email_verified',
  ROLE_CHANGED: 'auth.role_changed',
  PERMISSION_CHANGED: 'auth.permission_changed',
  ACCOUNT_LOCKED: 'auth.account_locked',
} as const;
