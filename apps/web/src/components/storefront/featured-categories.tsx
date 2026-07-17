import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { ROUTES } from '@/constants';
import { categoriesApi } from '@/services/sdk';
import { resolveMediaUrl } from '@/utils/cms';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HorizontalCarousel } from './horizontal-carousel';
import { HoverLift, MotionItem, MotionReveal } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface FeaturedCategoriesSectionProps {
  section?: HomeSection;
}

export function FeaturedCategoriesSection({ section }: FeaturedCategoriesSectionProps) {
  const query = useQuery({
    queryKey: QUERY_KEYS.categories.list({ featured: true }),
    queryFn: () =>
      categoriesApi.list({ status: 'active', limit: 8, sortBy: 'sortOrder', sortOrder: 'asc' }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Shop by category'}
      title={section?.title ?? 'Featured categories'}
      description={
        (section?.config?.description as string) ?? 'Find your next signature piece by category.'
      }
    >
      <AsyncSection
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error ?? undefined}
        data={query.data}
        isEmpty={(result) => !result?.data?.length}
        onRetry={() => void query.refetch()}
        skeleton={<SectionSkeleton />}
        emptyTitle="Categories coming soon"
      >
        {(result) => (
          <MotionReveal>
            <HorizontalCarousel
              label="Categories"
              itemClassName="w-[58%] sm:w-[34%] lg:w-[22%] 2xl:w-[18%]"
            >
              {result.data.map((category) => (
                <MotionItem key={category.id}>
                  <HoverLift>
                    <Link
                      to={ROUTES.categories}
                      className="group relative block overflow-hidden rounded-[1.75rem]"
                      aria-label={`Shop ${category.name}`}
                    >
                      <Image
                        src={category.imageUrl ?? resolveMediaUrl(category.image)}
                        alt={category.name}
                        aspectRatio="4/5"
                        className="transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                          {category.name}
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                          Shop now
                        </p>
                      </div>
                    </Link>
                  </HoverLift>
                </MotionItem>
              ))}
            </HorizontalCarousel>
          </MotionReveal>
        )}
      </AsyncSection>
    </Section>
  );
}
