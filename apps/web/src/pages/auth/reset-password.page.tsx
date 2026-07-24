import { useSearch } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { ResetPasswordForm } from '@/components/auth';

export function ResetPasswordPage() {
  const search = useSearch({ strict: false }) as { email?: string; devResetCode?: string };

  return (
    <>
      <Seo title="Reset password" description="Choose a new password for your account." noIndex />
      <ResetPasswordForm email={search.email} devResetCode={search.devResetCode} />
    </>
  );
}
