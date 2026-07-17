import { Seo } from '@/components/common/seo';
import { AddressesPanel } from '@/components/account';

export function AccountAddressesPage() {
  return (
    <>
      <Seo title="Addresses" description="Manage your saved addresses." noIndex />
      <AddressesPanel />
    </>
  );
}
