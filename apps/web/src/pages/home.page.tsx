import { Suspense } from 'react';
import { useHomeSections, usePublicSettings } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';
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
  const storeName =
    getSetting<string>(settings, 'store.name') ??
    getSetting<string>(settings, 'storeName') ??
    siteConfig.name;
  const description =
    getSetting<string>(settings, 'seo.description') ??
    getSetting<string>(settings, 'store.description') ??
    siteConfig.defaultDescription;
  const origin = buildAbsoluteUrl('/');

  return (
    <>
      <Seo
        title={storeName}
        description={description}
        url={origin}
        siteName={storeName}
        jsonLd={[
          buildOrganizationJsonLd({
            name: storeName,
            url: origin,
            logo: getSetting<string>(settings, 'store.logo'),
          }),
          buildWebsiteJsonLd({
            name: storeName,
            url: origin,
            searchUrlTemplate: `${buildAbsoluteUrl(siteConfig.searchPath)}?q={search_term_string}`,
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
          <ProductRailSection kind="random" eager={false} spacing="none" title="More to love" />
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
