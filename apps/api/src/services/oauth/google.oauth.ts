/**
 * Google OAuth — structure only (Phase 2+ implementation).
 * Wire Passport/Google OAuth client here without enabling in routes yet.
 */
export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface GoogleOAuthService {
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<GoogleProfile>;
}

export class GoogleOAuthStub implements GoogleOAuthService {
  getAuthorizationUrl(_state: string): string {
    throw new Error('Google OAuth is not configured yet');
  }

  async exchangeCode(_code: string): Promise<GoogleProfile> {
    throw new Error('Google OAuth is not configured yet');
  }
}

export const googleOAuthService: GoogleOAuthService = new GoogleOAuthStub();
