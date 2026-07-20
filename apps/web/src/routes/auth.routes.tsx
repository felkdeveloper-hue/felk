import { createRoute, redirect } from '@tanstack/react-router';
import { ROUTES } from '@/constants';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/pages/auth';
import { authLayoutRoute } from './layout-routes';

export const authIndexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.auth,
  beforeLoad: () => {
    throw redirect({ to: ROUTES.authLogin });
  },
});

export const authLoginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.authLogin,
  component: LoginPage,
});

export const authRegisterRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.authRegister,
  component: RegisterPage,
});

export const authVerifyEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.authVerifyEmail,
  component: VerifyEmailPage,
});

export const authForgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.authForgotPassword,
  component: ForgotPasswordPage,
});

export const authResetPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: ROUTES.authResetPassword,
  component: ResetPasswordPage,
});
