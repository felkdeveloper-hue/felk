import type { Request } from 'express';
import { otpService } from '@/services/otp.service.js';
import { setAuthCookies, type AuthRequestMeta } from '@/services/auth.service.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';

function meta(req: Request): AuthRequestMeta {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
    requestId: req.requestId,
  };
}

export const otpController = {
  sendOtp: asyncHandler(async (req, res) => {
    const result = await otpService.sendOtp(req.body.email, meta(req));
    ApiResponse.success(res, result, result.message);
  }),

  verifyOtp: asyncHandler(async (req, res) => {
    const result = await otpService.verifyOtp(req.body.email, req.body.otp, meta(req));
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
      result.message,
    );
  }),

  resendOtp: asyncHandler(async (req, res) => {
    const result = await otpService.resendOtp(req.body.email, meta(req));
    ApiResponse.success(res, result, result.message);
  }),
};
