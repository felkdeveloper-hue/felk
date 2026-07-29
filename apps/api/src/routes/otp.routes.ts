import { Router } from 'express';
import { otpController } from '@/controllers/otp.controller.js';
import { authRateLimiter, otpRateLimiter, validate } from '@/middlewares/index.js';
import { sendOtpSchema, verifyOtpSchema, resendOtpSchema } from '@/schemas/otp.schema.js';

export const otpRouter = Router();

otpRouter.use(authRateLimiter);

otpRouter.post(
  '/send-otp',
  otpRateLimiter,
  validate({ body: sendOtpSchema }),
  otpController.sendOtp,
);

otpRouter.post('/verify-otp', validate({ body: verifyOtpSchema }), otpController.verifyOtp);

otpRouter.post(
  '/resend-otp',
  otpRateLimiter,
  validate({ body: resendOtpSchema }),
  otpController.resendOtp,
);
