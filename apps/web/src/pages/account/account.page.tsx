import { Seo } from '@/components/common/seo';
import { AccountDashboard } from '@/components/account';

export function AccountPage() {
  return (
    <>
      <Seo
        title="My Account"
        description="Manage your Fashion Edge profile, orders, and preferences."
        noIndex
      />
      <AccountDashboard />
    </>
  );
}
