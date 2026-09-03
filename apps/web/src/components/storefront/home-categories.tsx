import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { HOME_CATEGORY_NAV_ITEMS } from '@/constants/home-category-nav';
import { cn } from '@/lib/utils';
import { MotionItem, MotionReveal } from './motion-reveal';

type HomeCategoryTile = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  objectClass?: string;
};

/**
 * Homepage Categories — same 8 labels + slugs as the mobile drawer CATEGORIES tab.
 * Local bundled images so tiles render on localhost without CMS/R2.
 */
export function HomeCategoriesSection() {
  const reduceMotion = useReducedMotion();

  const tiles = useMemo((): HomeCategoryTile[] => {
    return HOME_CATEGORY_NAV_ITEMS.map((tile) => ({
      id: tile.slug,
      slug: tile.slug,
      name: tile.label,
      imageUrl: tile.imageUrl,
      objectClass: tile.imageClassName,
    }));
  }, []);

  if (!tiles.length) return null;

  return (
    <Section spacing="none" className="bg-background" aria-label="Shop by category">
      <div className="mx-auto mb-3 max-w-[1680px] px-4 text-center sm:mb-4 sm:px-6 lg:px-8 xl:px-10">
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
                data-radius="lookbook"
                aria-label={`Shop ${category.name}`}
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    aspectRatio="3/4"
                    className={cn(
                      'transition-transform duration-700 ease-out group-hover:scale-[1.06]',
                      category.objectClass,
                    )}
                  />
                ) : (
                  <div className="bg-muted aspect-[3/4] w-full" />
                )}
                <div className="bg-linear-to-t absolute inset-0 from-black/70 via-black/15 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-2 pb-3 pt-8 sm:pb-4">
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
