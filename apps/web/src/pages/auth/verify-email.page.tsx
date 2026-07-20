import { useSearch } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { VerifyEmailPanel } from '@/components/auth';

export function VerifyEmailPage() {
  const search = useSearch({ strict: false }) as {
    token?: string;
    email?: string;
    pending?: string | boolean;
    devVerificationUrl?: string;
  };

  return (
    <>
      <Seo title="Verify email" description="Confirm your email address." noIndex />
      <VerifyEmailPanel
        token={search.token}
        email={search.email}
        pending={search.pending === true || search.pending === 'true'}
        devVerificationUrl={search.devVerificationUrl}
      />
    </>
  );
}
