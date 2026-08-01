import { Router } from 'express';
import { authController } from '@/controllers/auth.controller.js';
import {
  authenticate,
  authRateLimiter,
  optionalAuthenticate,
  otpRateLimiter,
  validate,
} from '@/middlewares/index.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/schemas/auth.schema.js';
import {
  checkoutCompleteGuestSchema,
  checkoutCompleteSignupSchema,
  checkoutEmailStatusSchema,
  checkoutSendOtpSchema,
  checkoutVerifyOtpSchema,
} from '@/schemas/checkout-auth.schema.js';

import { otpRouter } from '@/routes/otp.routes.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.use(otpRouter);

authRouter.post('/register', validate({ body: registerSchema }), authController.register);

authRouter.post('/login', validate({ body: loginSchema }), authController.login);

/** Guest checkout inline auth — never leaves the checkout UI. */
authRouter.post(
  '/checkout/email-status',
  validate({ body: checkoutEmailStatusSchema }),
  authController.checkoutEmailStatus,
);
authRouter.post(
  '/checkout/send-otp',
  otpRateLimiter,
  validate({ body: checkoutSendOtpSchema }),
  authController.checkoutSendOtp,
);
authRouter.post(
  '/checkout/verify-otp',
  validate({ body: checkoutVerifyOtpSchema }),
  authController.checkoutVerifyOtp,
);
authRouter.post(
  '/checkout/complete-signup',
  validate({ body: checkoutCompleteSignupSchema }),
  authController.checkoutCompleteSignup,
);
authRouter.post(
  '/checkout/complete-guest',
  validate({ body: checkoutCompleteGuestSchema }),
  authController.checkoutCompleteGuest,
);

authRouter.post('/refresh', validate({ body: refreshSchema }), authController.refresh);

authRouter.post('/logout', optionalAuthenticate, authController.logout);

authRouter.post('/logout-all', authenticate, authController.logoutAll);

authRouter.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

authRouter.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

authRouter.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

authRouter.post('/verify-email', validate({ body: verifyEmailSchema }), authController.verifyEmail);

authRouter.post(
  '/resend-verification',
  otpRateLimiter,
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);

authRouter.get('/me', authenticate, authController.me);
