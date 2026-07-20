import { useSearch } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { RegisterForm } from '@/components/auth';

export function RegisterPage() {
  const search = useSearch({ strict: false }) as { redirect?: string };

  return (
    <>
      <Seo title="Create account" description="Register for a new customer account." noIndex />
      <RegisterForm redirect={search.redirect} />
    </>
  );
}
