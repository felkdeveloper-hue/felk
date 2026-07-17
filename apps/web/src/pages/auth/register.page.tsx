import { Seo } from '@/components/common/seo';
import { RegisterForm } from '@/components/auth';

export function RegisterPage() {
  return (
    <>
      <Seo title="Create account" description="Register for a new customer account." noIndex />
      <RegisterForm />
    </>
  );
}
