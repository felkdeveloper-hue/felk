import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { categoriesApi, type Category } from '@/services/sdk';
import { resolveMediaUrl } from '@/utils/cms';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HorizontalCarousel } from './horizontal-carousel';
import { HoverLift, MotionReveal } from './motion-reveal';

const unsplash = (id: string, width = 900, height = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`;

/** Four large mood edits — 3 visible, 4th peeks in via carousel. */
const MOOD_TILES = [
  {
    slug: 'women',
    eyebrow: 'Winter specials',
    name: 'Sweaters & jackets',
    image: unsplash('photo-1483985988355-763728e1935b'),
  },
  {
    slug: 'essentials',
    eyebrow: 'Co-ord collection',
    name: 'Comfy co-ords',
    image: unsplash('photo-1490114538077-0a7f8cb49891'),
  },
  {
    slug: 'men',
    eyebrow: 'Denim days',
    name: 'Jeans under ₹999',
    image: unsplash('photo-1542272454315-4c01d7abdf4a'),
  },
  {
    slug: 'accessories',
    eyebrow: 'Finish the look',
    name: 'Accessories',
    image: unsplash('photo-1511499767150-a48a237f0083'),
  },
] as const;

type MoodTile = {
  id: string;
  slug: string;
  eyebrow: string;
  name: string;
  imageUrl: string;
};

function resolveMoodTiles(apiCategories: Category[] | undefined): MoodTile[] {
  const bySlug = new Map((apiCategories ?? []).map((category) => [category.slug, category]));

  return MOOD_TILES.map((tile) => {
    const matched = bySlug.get(tile.slug);
    return {
      id: matched?.id ?? tile.slug,
      slug: matched?.slug ?? tile.slug,
      eyebrow: tile.eyebrow,
      name: tile.name,
      imageUrl: matched?.imageUrl ?? resolveMediaUrl(matched?.image) ?? tile.image,
    };
  });
}

export interface ShopYourMoodSectionProps {
  section?: HomeSection;
}

export function ShopYourMoodSection({ section }: ShopYourMoodSectionProps) {
  const query = useQuery({
    queryKey: QUERY_KEYS.categories.list({ mood: true }),
    queryFn: () =>
      categoriesApi.list({ status: 'active', limit: 50, sortBy: 'sortOrder', sortOrder: 'asc' }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const title = section?.title ?? 'Shop your mood';
  const tiles = useMemo(() => resolveMoodTiles(query.data?.data), [query.data?.data]);

  return (
    <Section spacing="default" className="bg-background" aria-label={title}>
      <div className="mx-auto mb-8 max-w-[1600px] px-4 text-center sm:mb-10 sm:px-6 lg:px-10">
        <h2 className="font-display text-foreground text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl lg:text-4xl">
          {title}
        </h2>
      </div>

      <AsyncSection
        isLoading={query.isLoading && !query.data}
        isError={false}
        data={tiles}
        isEmpty={(items) => !items?.length}
        onRetry={() => void query.refetch()}
        skeleton={
          <div className="flex gap-5 overflow-hidden px-4 sm:gap-6 sm:px-6 lg:px-10">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-muted aspect-2/3 w-[90%] shrink-0 animate-pulse rounded-[1.75rem] sm:w-[55%] lg:w-[calc((100%-2.5rem)/3)]"
              />
            ))}
          </div>
        }
        emptyTitle="Categories coming soon"
      >
        {(items) => (
          <MotionReveal>
            <HorizontalCarousel
              label="Shop your mood"
              alwaysShowControls
              showDots
              scrollByItem
              itemClassName="w-[90%] sm:w-[55%] lg:w-[calc((100%-2.5rem)/3)]"
            >
              {items.map((category) => (
                <HoverLift key={category.id}>
                  <Link
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    preload="intent"
                    className="group relative block overflow-hidden rounded-[1.75rem]"
                    aria-label={`Shop ${category.name}`}
                  >
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      aspectRatio="2/3"
                      className="transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="bg-linear-to-t absolute inset-0 from-black/80 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 lg:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-sm">
                        {category.eyebrow}
                      </p>
                      <h3 className="font-display mt-2 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl lg:text-4xl">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </HoverLift>
              ))}
            </HorizontalCarousel>
          </MotionReveal>
        )}
      </AsyncSection>
    </Section>
  );
}
