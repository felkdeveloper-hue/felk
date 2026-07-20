import { ModuleHubPage } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';

export function CmsHubPage() {
  return (
    <ModuleHubPage
      title="CMS"
      description="Manage storefront content, banners, FAQs, and home page sections."
      links={[
        {
          label: 'Pages',
          to: ADMIN_ROUTES.cmsPages,
          description: 'Static pages, policies, and landing content.',
        },
        {
          label: 'Hero banners',
          to: ADMIN_ROUTES.cmsBanners,
          description: 'Primary storefront hero slideshow.',
        },
        {
          label: 'Home sections',
          to: ADMIN_ROUTES.cmsHome,
          description: 'Composable home page sections and featured modules.',
        },
        {
          label: 'FAQs',
          to: ADMIN_ROUTES.cmsFaqs,
          description: 'Help center questions and answers.',
        },
      ]}
    />
  );
}
