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
});

export const checkoutCompleteGuestSchema = z.object({
  signupToken: z.string().trim().min(20).max(2000),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(32).optional(),
});
