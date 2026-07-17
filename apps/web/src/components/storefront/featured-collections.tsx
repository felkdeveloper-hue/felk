import { Link } from '@tanstack/react-router';
import { useCollections } from '@/hooks/cms';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { ROUTES } from '@/constants';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HoverLift, MotionReveal, MotionItem } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface FeaturedCollectionsSectionProps {
  section?: HomeSection;
}

export function FeaturedCollectionsSection({ section }: FeaturedCollectionsSectionProps) {
  const query = useCollections();

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Curated edits'}
      title={section?.title ?? 'Featured collections'}
      description={
        (section?.config?.description as string) ??
        'Explore seasonal capsules and limited-run collaborations.'
      }
    >
      <Container>
        <AsyncSection
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          data={query.data}
          isEmpty={(result) => !result?.data?.length}
          onRetry={() => void query.refetch()}
          skeleton={<SectionSkeleton />}
          emptyTitle="Collections coming soon"
        >
          {(result) => (
            <MotionReveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.slice(0, 6).map((collection) => (
                <MotionItem key={collection.id}>
                  <HoverLift>
                    <Link
                      to={ROUTES.categories}
                      className="bg-muted group relative block overflow-hidden rounded-[1.75rem]"
                      aria-label={`Browse ${collection.name}`}
                    >
                      <Image
                        src={collection.imageUrl}
                        alt={collection.name}
                        aspectRatio="4/5"
                        className="transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                        <h3 className="font-display text-2xl font-bold uppercase tracking-tight">
                          {collection.name}
                        </h3>
                        {collection.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-white/75">
                            {collection.description}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </HoverLift>
                </MotionItem>
              ))}
            </MotionReveal>
          )}
        </AsyncSection>
      </Container>
    </Section>
  );
}
