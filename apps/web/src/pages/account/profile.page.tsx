import { Seo } from '@/components/common/seo';
import { ProfileForm } from '@/components/account';

export function AccountProfilePage() {
  return (
    <>
      <Seo title="Profile" description="Manage your personal details." noIndex />
      <ProfileForm />
    </>
  );
}
