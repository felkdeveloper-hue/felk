import { Seo } from '@/components/common/seo';
import { PreferencesPanel } from '@/components/account';

export function AccountPreferencesPage() {
  return (
    <>
      <Seo title="Preferences" description="Theme and notification preferences." noIndex />
      <PreferencesPanel />
    </>
  );
}
