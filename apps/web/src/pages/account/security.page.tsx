import { Seo } from '@/components/common/seo';
import { SecurityPanel } from '@/components/account';

export function AccountSecurityPage() {
  return (
    <>
      <Seo title="Security" description="Password and session settings." noIndex />
      <SecurityPanel />
    </>
  );
}
