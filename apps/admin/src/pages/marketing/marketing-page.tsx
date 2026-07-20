import { ModuleHubPage } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';

export function MarketingPage() {
  return (
    <ModuleHubPage
      title="Marketing"
      description="Promo creatives and campaign messaging for the storefront."
      links={[
        {
          label: 'Promo banners',
          to: ADMIN_ROUTES.marketingPromos,
          description: 'Sale strips, promo tiles, and campaign placements.',
        },
        {
          label: 'Hero banners',
          to: ADMIN_ROUTES.cmsBanners,
          description: 'Top-of-funnel hero creatives (shared with CMS).',
        },
      ]}
    />
  );
}
