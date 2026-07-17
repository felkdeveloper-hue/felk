import { CmsPageView } from '@/components/storefront';

export function PrivacyPage() {
  return (
    <CmsPageView
      slug="privacy"
      fallbackTitle="Privacy Policy"
      fallbackDescription="How we collect, use, and protect your data."
    />
  );
}
