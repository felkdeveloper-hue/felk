import { Suspense } from 'react';
import { useHomeSections, usePublicSettings } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';
import { getSetting } from '@/utils/cms';
import { HeroBannerSection, HomeSectionRenderer, SectionSkeleton } from '@/components/storefront';
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

      <HeroBannerSection />

      <AsyncSection
        isLoading={sectionsQuery.isLoading}
        isError={sectionsQuery.isError}
        error={sectionsQuery.error}
        data={sectionsQuery.data}
        isEmpty={(result) => !result?.data?.length}
        onRetry={() => void sectionsQuery.refetch()}
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
