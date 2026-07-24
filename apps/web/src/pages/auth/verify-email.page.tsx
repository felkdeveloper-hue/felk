import { useSearch } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { VerifyEmailPanel } from '@/components/auth';

export function VerifyEmailPage() {
  const search = useSearch({ strict: false }) as {
    email?: string;
    pending?: string | boolean;
  };

  return (
    <>
      <Seo title="Verify email" description="Confirm your email address." noIndex />
      <VerifyEmailPanel
        email={search.email}
        pending={search.pending === true || search.pending === 'true'}
      />
    </>
  );
}
