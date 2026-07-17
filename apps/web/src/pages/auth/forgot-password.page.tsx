import { Seo } from '@/components/common/seo';
import { ForgotPasswordForm } from '@/components/auth';

export function ForgotPasswordPage() {
  return (
    <>
      <Seo title="Forgot password" description="Reset your account password." noIndex />
      <ForgotPasswordForm />
    </>
  );
}
