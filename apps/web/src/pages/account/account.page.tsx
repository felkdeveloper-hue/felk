import { Seo } from '@/components/common/seo';
import { AccountDashboard } from '@/components/account';

export function AccountPage() {
  return (
    <>
      <Seo title="Account" description="Your account overview." noIndex />
      <AccountDashboard />
    </>
  );
}
