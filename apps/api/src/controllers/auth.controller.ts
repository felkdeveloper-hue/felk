import type { Request, Response } from 'express';
import {
  authService,
  clearAuthCookies,
  setAuthCookies,
  type AuthRequestMeta,
} from '@/services/auth.service';
import {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
} from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/async-handler';
import { ApiResponse } from '@/utils/response/api-response';
import { HTTP_STATUS } from '@/constants/http';

function meta(req: Request): AuthRequestMeta {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
    requestId: req.requestId,
  };
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, meta(req));
    ApiResponse.created(res, result, result.message);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, meta(req));
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
    await authService.logout({
      accessToken: getAccessTokenFromRequest(req),
      refreshToken: getRefreshTokenFromRequest(req),
      user: req.user,
      meta: meta(req),
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
    const result = await authService.resetPassword(req.body.token, req.body.password, meta(req));
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
    const result = await authService.verifyEmail(req.body.token, meta(req));
    ApiResponse.success(res, result, result.message);
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
};
