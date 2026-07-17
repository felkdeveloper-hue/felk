import type { AuthenticatedUser, RequestContext } from './index';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      context: RequestContext;
      user?: AuthenticatedUser;
      accessToken?: string;
      accessTokenJti?: string;
      /** Raw bytes captured for payment webhook signature verification. */
      rawBody?: Buffer;
    }
  }
}

export {};
