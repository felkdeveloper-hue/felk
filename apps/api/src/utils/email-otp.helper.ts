import bcrypt from 'bcrypt';

/** OTPs are short-lived — fewer rounds keeps send-otp under ~50ms. */
const BCRYPT_ROUNDS = 6;

/** Generate a secure 6-digit OTP (100000–999999). */
export function generateEmailOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashEmailOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export async function verifyEmailOtp(otp: string, otpHash: string): Promise<boolean> {
  return bcrypt.compare(otp, otpHash);
}
