import { z } from 'zod';
import { REGEX } from '@/constants/regex.js';

export const sendOtpSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  otp: z.string().regex(REGEX.OTP, 'Enter the 6-digit code'),
});

export const resendOtpSchema = sendOtpSchema;
