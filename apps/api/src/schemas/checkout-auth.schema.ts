import { z } from 'zod';

export const checkoutEmailStatusSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const checkoutSendOtpSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const checkoutVerifyOtpSchema = z.object({
  email: z.string().trim().email().max(255),
  otp: z.string().trim().min(4).max(12),
});

export const checkoutCompleteSignupSchema = z.object({
  signupToken: z.string().trim().min(20).max(2000),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(32).optional(),
  fbp: z.string().max(200).optional().nullable(),
  fbc: z.string().max(200).optional().nullable(),
  fbclid: z.string().max(500).optional().nullable(),
});

export const checkoutCompleteGuestSchema = z.object({
  signupToken: z.string().trim().min(20).max(2000),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(32).optional(),
});

/** One-click guest checkout — no email/OTP; address collected on the information step. */
export const checkoutContinueAsGuestSchema = z.object({
  guestCartToken: z.string().trim().min(8).max(200).optional(),
  visitorId: z.string().uuid().optional(),
  utmSource: z.string().trim().max(200).optional().nullable(),
  utmMedium: z.string().trim().max(200).optional().nullable(),
  utmCampaign: z.string().trim().max(200).optional().nullable(),
  utmTerm: z.string().trim().max(200).optional().nullable(),
  utmContent: z.string().trim().max(200).optional().nullable(),
  referrer: z.string().trim().max(2000).optional().nullable(),
  fbclid: z.string().trim().max(500).optional().nullable(),
  gclid: z.string().trim().max(500).optional().nullable(),
  ttclid: z.string().trim().max(500).optional().nullable(),
  msclkid: z.string().trim().max(500).optional().nullable(),
  igshid: z.string().trim().max(500).optional().nullable(),
  inAppSource: z.string().trim().max(50).optional().nullable(),
  landingPath: z.string().trim().max(2000).optional().nullable(),
});
