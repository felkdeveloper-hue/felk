import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';
import bagsImage from '@/assets/images/Categories/Bags.png';
import corsetImage from '@/assets/images/Categories/Corset.png';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import jeansImage from '@/assets/images/Categories/Jeans.png';
import newArrivalImage from '@/assets/images/Categories/New Arrival.png';
import oversizedImage from '@/assets/images/Categories/Oversized.png';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import jacketImage from '@/assets/images/Categories/WomenJacket.png';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { useCategoriesList } from '@/hooks/catalog/use-categories';
import type { Category } from '@/services/sdk';
import { MotionItem, MotionReveal } from './motion-reveal';

const FALLBACK_TILES = [
  { slug: 'new-arrivals', name: 'New Arrival', image: newArrivalImage },
  { slug: 'jeans', name: 'Jeans', image: jeansImage },
  { slug: 'oversized', name: 'Oversized', image: oversizedImage },
  { slug: 'corset', name: 'Corset', image: corsetImage },
  { slug: 'hoodies', name: 'Hoodies', image: hoodieImage },
  { slug: 'jackets', name: 'Jackets', image: jacketImage },
  { slug: 'bags', name: 'Bags', image: bagsImage },
  { slug: 'shoes', name: 'Shoes', image: shoesImage },
] as const;

type HomeCategoryTile = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
};

function resolveHomeTiles(apiCategories: Category[] | undefined): HomeCategoryTile[] {
  const bySlug = new Map(
    (apiCategories ?? [])
      .filter((category) => category.status !== 'archived')
      .map((category) => [category.slug, category]),
  );

  // Always render the designed homepage grid with local images; wire up API
  // ids/slugs when those categories exist so links stay valid.
  return FALLBACK_TILES.map((tile) => {
    const matched = bySlug.get(tile.slug);
    return {
      id: matched?.id ?? tile.slug,
      slug: matched?.slug ?? tile.slug,
      name: matched?.name ?? tile.name,
      imageUrl: tile.image,
    };
  });
}

export function HomeCategoriesSection() {
  const reduceMotion = useReducedMotion();
  const categoriesQuery = useCategoriesList();
  const tiles = useMemo(
    () => resolveHomeTiles(categoriesQuery.data?.data),
    [categoriesQuery.data?.data],
  );

  if (!tiles.length) return null;

  return (
    <Section spacing="default" className="bg-background" aria-label="Shop by category">
      <div className="mx-auto mb-8 max-w-[1680px] px-4 text-center sm:mb-10 sm:px-6 lg:px-8 xl:px-10">
        <h2 className="font-display text-foreground text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl lg:text-4xl">
          Categories
        </h2>
      </div>

      <MotionReveal
        stagger
        className="mx-auto grid max-w-[1680px] grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 md:grid-cols-4 lg:gap-5 lg:px-8 xl:px-10"
      >
        {tiles.map((category) => (
          <MotionItem key={category.id}>
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to="/categories/$slug"
                params={{ slug: category.slug }}
                preload="intent"
                className="group relative block overflow-hidden rounded-2xl"
                aria-label={`Shop ${category.name}`}
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    aspectRatio="3/4"
                    className="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="bg-muted aspect-[3/4] w-full" />
                )}
                <div className="bg-linear-to-t absolute inset-0 from-black/70 via-black/15 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center px-2 pb-3 pt-8 sm:pb-4">
                  <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-[11px] lg:text-xs">
                    {category.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          </MotionItem>
        ))}
      </MotionReveal>
    </Section>
  );
}
