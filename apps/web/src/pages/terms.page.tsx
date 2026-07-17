import { CmsPageView } from '@/components/storefront';

export function TermsPage() {
  return (
    <CmsPageView
      slug="terms"
      fallbackTitle="Terms of Service"
      fallbackDescription="Terms and conditions for using our store."
    />
  );
}
