import { z } from 'zod';
import { AUTH_PORTAL } from '@/constants/auth.js';
import { REGEX } from '@/constants/regex.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

const registerPasswordSchema = z.string().min(8, 'Password must be at least 8 characters');

/** Optional browser attribution — used to stamp Source on the user at login/register. */
export const attributionFieldsSchema = z.object({
  visitorId: z.string().trim().min(1).max(128).optional(),
  utmSource: z.string().trim().max(200).nullable().optional(),
  utmMedium: z.string().trim().max(200).nullable().optional(),
  utmCampaign: z.string().trim().max(200).nullable().optional(),
  utmTerm: z.string().trim().max(200).nullable().optional(),
  utmContent: z.string().trim().max(200).nullable().optional(),
  referrer: z.string().trim().max(2000).nullable().optional(),
  fbclid: z.string().trim().max(500).nullable().optional(),
  gclid: z.string().trim().max(500).nullable().optional(),
  ttclid: z.string().trim().max(500).nullable().optional(),
  msclkid: z.string().trim().max(500).nullable().optional(),
  igshid: z.string().trim().max(500).nullable().optional(),
  inAppSource: z.string().trim().max(64).nullable().optional(),
  landingPath: z.string().trim().max(500).nullable().optional(),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.trim().toLowerCase()),
    password: registerPasswordSchema,
    firstName: z.string().trim().min(1).max(100),
    // Optional — single-name signups leave this empty (not a copy of firstName).
    lastName: z.string().trim().max(100).optional().default(''),
    phone: z.string().regex(REGEX.E164_PHONE).optional(),
  })
  .merge(attributionFieldsSchema);

export const loginSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(1),
    rememberMe: z.boolean().optional().default(false),
    portal: z
      .enum([AUTH_PORTAL.CUSTOMER, AUTH_PORTAL.ADMIN])
      .optional()
      .default(AUTH_PORTAL.CUSTOMER),
  })
  .merge(attributionFieldsSchema);

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  code: z.string().regex(REGEX.OTP, 'Enter the 6-digit code'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.trim().toLowerCase()),
    code: z.string().regex(REGEX.OTP, 'Enter the 6-digit code'),
  })
  .merge(attributionFieldsSchema);

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
});
