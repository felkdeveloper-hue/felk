import { useCmsPage, usePublicSettings } from '@/hooks/cms';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import type { CmsPage } from '@/services/sdk/cms';
import { extractSeo } from '@/utils/cms';
import { AsyncSection } from './async-section';
import { SectionSkeleton } from './section-skeleton';

export interface CmsPageViewProps {
  slug: string;
  fallbackTitle: string;
  fallbackDescription?: string;
}

export function CmsPageView({ slug, fallbackTitle, fallbackDescription }: CmsPageViewProps) {
  const pageQuery = useCmsPage(slug);
  const settingsQuery = usePublicSettings();

  return (
    <AsyncSection<CmsPage>
      isLoading={pageQuery.isLoading || settingsQuery.isLoading}
      isError={pageQuery.isError}
      error={pageQuery.error}
      data={pageQuery.data ?? undefined}
      isEmpty={(page) => !page}
      onRetry={() => void pageQuery.refetch()}
      skeleton={<SectionSkeleton />}
      emptyTitle={`${fallbackTitle} page not found`}
      emptyDescription="This page hasn't been published yet."
    >
      {(page) => {
        const seo = extractSeo(page, settingsQuery.data);
        const title = seo.title ?? fallbackTitle;
        const description = seo.description ?? fallbackDescription ?? siteConfig.defaultDescription;
        const url = buildAbsoluteUrl(`/${slug}`);

        return (
          <>
            <Seo
              title={title}
              description={description}
              image={seo.image}
              url={url}
              siteName={seo.siteName ?? siteConfig.name}
              jsonLd={buildBreadcrumbJsonLd([
                { name: 'Home', url: buildAbsoluteUrl('/') },
                { name: title, url },
              ])}
            />

            <Container className="py-14 sm:py-20">
              <article className="mx-auto max-w-3xl">
                <header className="mb-10 space-y-3">
                  <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">
                    {slug}
                  </p>
                  <h1 className="font-display text-foreground text-4xl sm:text-5xl">
                    {page.title}
                  </h1>
                  {page.excerpt ? (
                    <p className="text-muted-foreground text-lg">{page.excerpt}</p>
                  ) : null}
                </header>

                {page.body ? (
                  <div
                    className="prose prose-neutral dark:prose-invert prose-headings:font-display prose-a:text-primary max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.body }}
                  />
                ) : null}
              </article>
            </Container>
          </>
        );
      }}
    </AsyncSection>
  );
}
