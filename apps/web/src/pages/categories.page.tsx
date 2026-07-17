import { Link } from '@tanstack/react-router';
import { Seo } from '@/components/common/seo';
import { Container } from '@/components/layout/container';
import { Image } from '@/components/media/image';
import { buildAbsoluteUrl, siteConfig } from '@/config';
import { useCategoryTree } from '@/hooks/catalog';
import { AsyncSection } from '@/components/storefront/async-section';
import { HoverLift, MotionItem, MotionReveal } from '@/components/storefront/motion-reveal';
import { SectionSkeleton } from '@/components/storefront/section-skeleton';

export function CategoriesPage() {
  const query = useCategoryTree();

  return (
    <>
      <Seo
        title="Categories"
        description={`Shop ${siteConfig.name} by category.`}
        url={buildAbsoluteUrl('/categories')}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-10 space-y-3">
          <p className="text-primary text-xs font-medium uppercase tracking-[0.2em]">Browse</p>
          <h1 className="font-display text-foreground text-4xl sm:text-5xl">Categories</h1>
          <p className="text-muted-foreground max-w-2xl">
            Explore collections organized by category.
          </p>
        </header>

        <AsyncSection
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          data={query.data}
          isEmpty={(items) => !items?.length}
          onRetry={() => void query.refetch()}
          skeleton={<SectionSkeleton />}
          emptyTitle="No categories yet"
        >
          {(categories) => (
            <MotionReveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <MotionItem key={category.id}>
                  <HoverLift>
                    <Link
                      to="/categories/$slug"
                      params={{ slug: category.slug }}
                      preload="intent"
                      className="border-border bg-card block overflow-hidden rounded-2xl border"
                    >
                      <Image src={category.imageUrl} alt={category.name} aspectRatio="4/3" />
                      <div className="p-5">
                        <h2 className="font-display text-2xl">{category.name}</h2>
                        {category.description ? (
                          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                            {category.description}
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
    </>
  );
}
