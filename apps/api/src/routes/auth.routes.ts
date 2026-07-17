import { Router } from 'express';
import { authController } from '@/controllers/auth.controller';
import { authenticate, authRateLimiter, optionalAuthenticate, validate } from '@/middlewares';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/schemas/auth.schema';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validate({ body: registerSchema }), authController.register);

authRouter.post('/login', validate({ body: loginSchema }), authController.login);

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
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);

authRouter.get('/me', authenticate, authController.me);
