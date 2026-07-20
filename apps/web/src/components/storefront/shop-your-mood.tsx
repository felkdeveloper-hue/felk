import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import ethnicWearImage from '@/assets/images/Crousel Image/EthenicWear.png';
import newInImage from '@/assets/images/Crousel Image/banner2.png';
import mensCarouselImage from '@/assets/images/Crousel Image/menscrousel.png';
import womenCarouselImage from '@/assets/images/Crousel Image/womenCrousel.png';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { categoriesApi, type Category } from '@/services/sdk';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HorizontalCarousel } from './horizontal-carousel';
import { HoverLift, MotionReveal } from './motion-reveal';

/** Four large category edits — 3 visible, 4th peeks in via carousel. */
const MOOD_TILES = [
  {
    slug: 'women',
    eyebrow: 'Women',
    name: "Women's edit",
    image: womenCarouselImage,
  },
  {
    slug: 'men',
    eyebrow: 'Men',
    name: "Men's edit",
    image: mensCarouselImage,
  },
  {
    slug: 'ethnic-wear',
    eyebrow: 'Ethnic',
    name: 'Ethnic wear',
    image: ethnicWearImage,
    fallbackSlug: 'women',
  },
  {
    slug: 'new-in',
    eyebrow: 'Just dropped',
    name: 'New in',
    image: newInImage,
    fallbackSlug: 'essentials',
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
    const fallbackSlug = 'fallbackSlug' in tile ? tile.fallbackSlug : undefined;
    const matched = bySlug.get(tile.slug) ?? (fallbackSlug ? bySlug.get(fallbackSlug) : undefined);
    return {
      id: matched?.id ?? tile.slug,
      slug: matched?.slug ?? fallbackSlug ?? tile.slug,
      eyebrow: tile.eyebrow,
      name: tile.name,
      imageUrl: tile.image,
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
