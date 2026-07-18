import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { QUERY_KEYS } from '@/constants/query-keys';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { categoriesApi, type Category } from '@/services/sdk';
import { resolveMediaUrl } from '@/utils/cms';
import type { HomeSection } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { MotionItem, MotionReveal } from './motion-reveal';

const unsplash = (id: string, width = 800, height = 1067) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`;

/** Curated tiles matching the featured-categories reference layout. */
const FEATURED_TILES = [
  {
    slug: 'shirts',
    name: 'Shirts',
    image: unsplash('photo-1596755094514-f87e34085b2c'),
    fallbackSlug: 'men',
  },
  {
    slug: 'shoes',
    name: 'Shoes',
    image: unsplash('photo-1542291026-7eec264c27ff'),
    fallbackSlug: 'essentials',
  },
  {
    slug: 'jeans',
    name: 'Jeans',
    image: unsplash('photo-1542272454315-4c01d7abdf4a'),
    fallbackSlug: 'men',
  },
  {
    slug: 'perfumes',
    name: 'Perfumes',
    image: unsplash('photo-1541643600914-78b084683601'),
    fallbackSlug: 'accessories',
  },
  {
    slug: 't-shirts',
    name: 'T-Shirts',
    image: unsplash('photo-1521572163474-6864f9cf17ab'),
    fallbackSlug: 'essentials',
  },
  {
    slug: 'skirts',
    name: 'Skirts',
    image: unsplash('photo-1583496661160-fb5886a0aaaa'),
    fallbackSlug: 'women',
  },
  {
    slug: 'heels-boots',
    name: 'Heels & Boots',
    image: unsplash('photo-1543163521-1bf539c55dd2'),
    fallbackSlug: 'women',
  },
  {
    slug: 'sunglasses',
    name: 'Sunglasses',
    image: unsplash('photo-1511499767150-a48a237f0083'),
    fallbackSlug: 'accessories',
  },
  {
    slug: 'hoodies',
    name: 'Hoodies',
    image: unsplash('photo-1556821840-3a63f95609a7'),
    fallbackSlug: 'men',
  },
] as const;

type FeaturedTile = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
};

function resolveTiles(apiCategories: Category[] | undefined): FeaturedTile[] {
  const bySlug = new Map((apiCategories ?? []).map((category) => [category.slug, category]));

  return FEATURED_TILES.map((tile) => {
    const matched = bySlug.get(tile.slug) ?? bySlug.get(tile.fallbackSlug);
    return {
      id: matched?.id ?? tile.slug,
      slug: matched?.slug ?? tile.fallbackSlug,
      name: tile.name,
      imageUrl: matched?.imageUrl ?? resolveMediaUrl(matched?.image) ?? tile.image,
    };
  });
}

export interface FeaturedCategoriesSectionProps {
  section?: HomeSection;
}

export function FeaturedCategoriesSection({ section }: FeaturedCategoriesSectionProps) {
  const reduceMotion = useReducedMotion();
  const query = useQuery({
    queryKey: QUERY_KEYS.categories.list({ featured: true }),
    queryFn: () =>
      categoriesApi.list({ status: 'active', limit: 50, sortBy: 'sortOrder', sortOrder: 'asc' }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const title = section?.title ?? 'Featured Categories';
  const showAnnouncement = Boolean(section?.config?.announcement ?? true);
  const announcementEyebrow = (section?.config?.announcementEyebrow as string) ?? 'Worth the wait';
  const announcementTitle = (section?.config?.announcementTitle as string) ?? 'Dropping soon';

  const tiles = useMemo(() => resolveTiles(query.data?.data), [query.data?.data]);

  return (
    <Section spacing="default" className="bg-background">
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
          <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 md:grid-cols-4 lg:grid-cols-5 lg:gap-5 lg:px-10">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-muted aspect-3/4 animate-pulse rounded-[1.35rem]" />
            ))}
          </div>
        }
        emptyTitle="Categories coming soon"
      >
        {(items) => (
          <MotionReveal
            stagger
            className="mx-auto grid max-w-[1600px] grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 md:grid-cols-4 lg:grid-cols-5 lg:gap-5 lg:px-10"
          >
            {showAnnouncement ? (
              <MotionItem>
                <motion.div
                  className="aspect-3/4 flex flex-col items-center justify-center rounded-[1.35rem] bg-[#c4a574] px-4 text-center"
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/70 sm:text-[11px]">
                    {announcementEyebrow}
                  </p>
                  <p className="font-display mt-2 text-xl font-bold uppercase leading-none tracking-tight text-black sm:text-2xl lg:text-[1.65rem]">
                    {announcementTitle}
                  </p>
                </motion.div>
              </MotionItem>
            ) : null}

            {items.map((category) => (
              <MotionItem key={category.id}>
                <motion.div
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    preload="intent"
                    className="group relative block overflow-hidden rounded-[1.35rem]"
                    aria-label={`Shop ${category.name}`}
                  >
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      aspectRatio="3/4"
                      className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                    <div className="bg-linear-to-t absolute inset-0 from-black/70 via-black/15 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-4 pt-10 sm:pb-5">
                      <h3 className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-xs lg:text-[13px]">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              </MotionItem>
            ))}
          </MotionReveal>
        )}
      </AsyncSection>
    </Section>
  );
}
