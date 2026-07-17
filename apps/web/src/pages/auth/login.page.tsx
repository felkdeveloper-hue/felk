import { useSearch } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { LoginForm } from '@/components/auth';

export function LoginPage() {
  const search = useSearch({ strict: false }) as { redirect?: string; reset?: string | boolean };

  return (
    <>
      <Seo title="Sign in" description="Sign in to your account." noIndex />
      <LoginForm
        redirect={search.redirect}
        resetSuccess={search.reset === true || search.reset === 'true'}
      />
    </>
  );
}
