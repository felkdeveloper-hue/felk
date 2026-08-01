import type { Request, Response } from 'express';
import {
  authService,
  clearAuthCookies,
  setAuthCookies,
  type AuthRequestMeta,
} from '@/services/auth.service.js';
import { checkoutAuthService } from '@/services/checkout-auth.service.js';
import {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
} from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import { HTTP_STATUS } from '@/constants/http.js';
import { emitBusinessEvent } from '@/services/platform-analytics/index.js';

function meta(req: Request): AuthRequestMeta {
  const countryCode =
    req.get('cf-ipcountry') ||
    req.get('x-vercel-ip-country') ||
    req.get('cloudfront-viewer-country') ||
    req.get('x-country-code') ||
    undefined;
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
    requestId: req.requestId,
    countryCode: countryCode || undefined,
  };
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, meta(req));
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'signup',
      userId: (result as { user?: { id?: string } }).user?.id ?? null,
      properties: { portal: (req.body as { portal?: string }).portal ?? 'customer' },
    });
    ApiResponse.created(res, result, result.message);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'login',
      userId: result.user?.id ?? null,
      properties: { portal: (req.body as { portal?: string }).portal ?? 'customer' },
    });
    ApiResponse.success(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      'Login successful',
    );
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);
    const result = await authService.refresh(refreshToken ?? '', meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });
    ApiResponse.success(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      'Token refreshed',
    );
  }),

  logout: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    await authService.logout({
      accessToken: getAccessTokenFromRequest(req),
      refreshToken: getRefreshTokenFromRequest(req),
      user: req.user,
      meta: meta(req),
    });
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'logout',
      userId,
    });
    clearAuthCookies(res);
    ApiResponse.success(res, null, 'Logged out');
  }),

  logoutAll: asyncHandler(async (req, res) => {
    if (!req.user) {
      ApiResponse.error(res, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
      return;
    }

    await authService.logoutAll(req.user.id, meta(req), req.accessTokenJti);
    clearAuthCookies(res);
    ApiResponse.success(res, null, 'Logged out from all devices');
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email, meta(req));
    ApiResponse.success(res, result, result.message);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(
      req.body.email,
      req.body.code,
      req.body.password,
      meta(req),
    );
    ApiResponse.success(res, result, result.message);
  }),

  changePassword: asyncHandler(async (req, res) => {
    const result = await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      meta(req),
    );
    ApiResponse.success(res, result, result.message);
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body.email, req.body.code, meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: false,
    });
    ApiResponse.success(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      result.message,
    );
  }),

  resendVerification: asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.body.email, meta(req));
    ApiResponse.success(res, result, result.message);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const me = await authService.getMe(req.user!.id);
    me.sessionId = req.user!.sessionId;
    ApiResponse.success(res, me);
  }),

  checkoutEmailStatus: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.emailStatus(req.body.email);
    ApiResponse.success(res, result);
  }),

  checkoutSendOtp: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.sendOtp(req.body.email, meta(req));
    ApiResponse.success(res, result, result.message);
  }),

  checkoutVerifyOtp: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.verifyOtp(req.body.email, req.body.otp);
    if (result.mode === 'login') {
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        rememberMe: result.rememberMe,
      });
      ApiResponse.success(
        res,
        {
          mode: 'login',
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer',
          user: result.user,
        },
        result.message,
      );
      return;
    }
    ApiResponse.success(res, result, result.message);
  }),

  checkoutCompleteSignup: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.completeSignup(req.body, meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'signup',
      userId: result.user?.id ?? null,
      properties: { portal: 'customer', source: 'checkout' },
    });
    ApiResponse.created(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      result.message,
    );
  }),

  checkoutCompleteGuest: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.completeAsGuest(req.body, meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'signup',
      userId: result.user?.id ?? null,
      properties: { portal: 'customer', source: 'checkout_guest' },
    });
    ApiResponse.created(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      result.message,
    );
  }),

  checkoutContinueAsGuest: asyncHandler(async (req, res) => {
    const result = await checkoutAuthService.continueAsGuest(req.body ?? {}, meta(req));
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: result.rememberMe,
    });
    void emitBusinessEvent({
      eventId: crypto.randomUUID(),
      name: 'signup',
      userId: result.user?.id ?? null,
      properties: { portal: 'customer', source: 'checkout_continue_as_guest' },
    });
    ApiResponse.created(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
        user: result.user,
      },
      result.message,
    );
  }),
};
