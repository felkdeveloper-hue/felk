import { CmsPageView } from '@/components/storefront';

export function AboutPage() {
  return (
    <CmsPageView
      slug="about"
      fallbackTitle="About"
      fallbackDescription="Our brand story and values."
    />
  );
}
