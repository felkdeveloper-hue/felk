import { Suspense } from 'react';
import { useHomeSections, usePublicSettings } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { buildOrganizationJsonLd, buildStoreJsonLd, buildWebsiteJsonLd } from '@/lib/seo';
import { getSetting } from '@/utils/cms';
import {
  HeroBannerSection,
  HomeBeforeFeaturedBannerSection,
  HomeCategoriesSection,
  HomeEditorialBannerSection,
  HomeSectionRenderer,
  HomeSplitBannersSection,
  ProductGridSection,
  ProductRailSection,
  SectionSkeleton,
} from '@/components/storefront';
import { AsyncSection } from '@/components/storefront/async-section';

export function HomePage() {
  const settingsQuery = usePublicSettings();
  const sectionsQuery = useHomeSections();

  const settings = settingsQuery.data;
  const description =
    getSetting<string>(settings, 'seo.description') ??
    getSetting<string>(settings, 'store.description') ??
    siteConfig.defaultDescription;
  const origin = buildAbsoluteUrl('/');
  const logoUrl = getSetting<string>(settings, 'store.logo') ?? buildAbsoluteUrl('/favicon.svg');
  const sameAs = [
    siteConfig.social.facebook,
    siteConfig.social.instagram,
    siteConfig.social.tiktok,
  ];

  return (
    <>
      <Seo
        title="Women’s Clothing Online Sri Lanka"
        description={description}
        url={origin}
        siteName="Fashion Edge"
        image={logoUrl}
        jsonLd={[
          buildOrganizationJsonLd({
            name: 'Fashion Edge',
            alternateName: ['FE', 'fe.', 'fe.lk', 'FE cloth website'],
            url: 'https://fe.lk',
            logo: logoUrl,
            sameAs,
            description,
            email: 'support@fe.lk',
            telephone: '+94812204315',
            address: [
              {
                '@type': 'PostalAddress',
                streetAddress: siteConfig.stores.kandy.street,
                addressLocality: siteConfig.stores.kandy.city,
                addressCountry: 'LK',
              },
              {
                '@type': 'PostalAddress',
                streetAddress: siteConfig.stores.colombo.street,
                addressLocality: siteConfig.stores.colombo.city,
                addressCountry: 'LK',
              },
            ],
          }),
          buildWebsiteJsonLd({
            name: 'Fashion Edge',
            alternateName: ['FE', 'fe.lk'],
            url: 'https://fe.lk',
            searchUrlTemplate: `${buildAbsoluteUrl(siteConfig.searchPath)}?q={search_term_string}`,
          }),
          buildStoreJsonLd({
            name: 'Fashion Edge',
            url: 'https://fe.lk',
            image: logoUrl,
            telephone: ['+94812204315', '+94711161740'],
            sameAs,
            priceRange: '$$',
            address: {
              '@type': 'PostalAddress',
              streetAddress: siteConfig.stores.kandy.street,
              addressLocality: 'Kandy',
              addressCountry: 'LK',
            },
          }),
        ]}
      />

      {/* Section 1 — full-bleed hero (existing images kept) */}
      <HeroBannerSection />

      {/* Section 2 — zero-gap dual women’s banners */}
      <HomeSplitBannersSection />

      {/* Section 3 — full-viewport women’s editorial */}
      <HomeEditorialBannerSection />

      <div className="flex flex-col gap-8 pt-10 sm:gap-10 sm:pt-12">
        <ProductRailSection kind="best-sellers" eager spacing="none" title="Best Sellers" />
        <HomeCategoriesSection />
        <div className="pt-2 sm:pt-3">
          <ProductRailSection
            kind="more-to-love"
            eager={false}
            spacing="none"
            title="More to love"
          />
        </div>
      </div>

      {/* Full-viewport banner before Featured Products — admin: home_before_featured */}
      <HomeBeforeFeaturedBannerSection />

      <div className="pt-8 sm:pt-10">
        <ProductGridSection spacing="none" />
      </div>

      <AsyncSection
        isLoading={sectionsQuery.isLoading}
        isError={sectionsQuery.isError}
        error={sectionsQuery.error}
        data={sectionsQuery.data}
        isEmpty={(result) => !result?.data?.length}
        onRetry={() => void sectionsQuery.refetch()}
        failMode="hide"
        skeleton={<SectionSkeleton />}
        emptyTitle=""
        emptyDescription=""
      >
        {(result) => (
          <Suspense fallback={<SectionSkeleton />}>
            {result.data.map((section) => (
              <HomeSectionRenderer key={section.id} section={section} />
            ))}
          </Suspense>
        )}
      </AsyncSection>
    </>
  );
}
