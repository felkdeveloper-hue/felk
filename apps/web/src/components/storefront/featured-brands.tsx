import { Link } from '@tanstack/react-router';
import { useBrands } from '@/hooks/cms';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { ROUTES } from '@/constants';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HoverLift, MotionItem, MotionReveal } from './motion-reveal';
import { SectionSkeleton } from './section-skeleton';

export interface FeaturedBrandsSectionProps {
  section?: HomeSection;
}

export function FeaturedBrandsSection({ section }: FeaturedBrandsSectionProps) {
  const query = useBrands();

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? 'Partners'}
      title={section?.title ?? 'Featured brands'}
      description={
        (section?.config?.description as string) ??
        'Independent labels and heritage houses we love.'
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
          emptyTitle="Brands coming soon"
        >
          {(result) => (
            <MotionReveal
              stagger
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {result.data.map((brand) => (
                <MotionItem key={brand.id}>
                  <HoverLift>
                    <Link
                      to={ROUTES.products}
                      className="border-border bg-card hover:border-foreground/20 flex aspect-[3/2] items-center justify-center rounded-xl border p-4 transition-colors"
                      aria-label={`Shop ${brand.name}`}
                    >
                      {brand.logoUrl ? (
                        <Image
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="max-h-10 w-auto object-contain"
                          containerClassName="flex items-center justify-center bg-transparent"
                        />
                      ) : (
                        <span className="font-display text-foreground text-lg">{brand.name}</span>
                      )}
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
