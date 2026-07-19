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
  id: 'auth-index',
  beforeLoad: () => {
    throw redirect({ to: ROUTES.authLogin });
  },
});

export const authLoginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'login',
  component: LoginPage,
});

export const authRegisterRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'register',
  component: RegisterPage,
});

export const authVerifyEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'verify-email',
  component: VerifyEmailPage,
});

export const authForgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'forgot-password',
  component: ForgotPasswordPage,
});

export const authResetPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'reset-password',
  component: ResetPasswordPage,
});
