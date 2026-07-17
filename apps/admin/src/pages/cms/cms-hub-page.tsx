import { ModuleHubPage } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';

export function CmsHubPage() {
  return (
    <ModuleHubPage
      title="CMS"
      description="Manage storefront content, banners, and home page sections."
      links={[
        {
          label: 'Pages',
          to: ADMIN_ROUTES.cmsPages,
          description: 'Static pages, policies, and landing content.',
        },
        {
          label: 'Banners',
          to: ADMIN_ROUTES.cmsBanners,
          description: 'Hero and promotional banner slots.',
        },
        {
          label: 'Home sections',
          to: ADMIN_ROUTES.cmsHome,
          description: 'Composable home page sections and featured content.',
        },
      ]}
    />
  );
}
