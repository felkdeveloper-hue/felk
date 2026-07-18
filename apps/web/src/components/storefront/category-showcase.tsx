import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import type { HomeSection } from '@/services/sdk/cms';

const unsplash = (id: string, width = 800, height = 960) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`;

export interface ShowcaseCategory {
  id: string;
  label: string;
  slug: string;
  leftImage: string;
  rightImage: string;
}

const DEFAULT_CATEGORIES: ShowcaseCategory[] = [
  {
    id: 'sneakers',
    label: 'Sneakers',
    slug: 'shoes',
    leftImage: unsplash('photo-1552346154-21d32810aba3'),
    rightImage: unsplash('photo-1600185365926-3a2ce3cdb9eb'),
  },
  {
    id: 'active-shoes',
    label: 'Active Shoes',
    slug: 'shoes',
    leftImage: unsplash('photo-1542291026-7eec264c27ff'),
    rightImage: unsplash('photo-1606107557195-0e29a4b5b4aa'),
  },
  {
    id: 'adventure',
    label: 'Adventure',
    slug: 'essentials',
    leftImage: unsplash('photo-1553062407-98eeb64c6a62'),
    rightImage: unsplash('photo-1475483768296-61615e7020f8'),
  },
  {
    id: 'belts-wallets',
    label: 'Belts & Wallets',
    slug: 'accessories',
    leftImage: unsplash('photo-1627123424574-724758594e93'),
    rightImage: unsplash('photo-1590874103328-eac38a674692'),
  },
  {
    id: 'oversized-t-shirts',
    label: 'Oversized T-Shirts',
    slug: 'oversized-tees',
    leftImage: unsplash('photo-1576566588028-4147f3842f27'),
    rightImage: unsplash('photo-1521572163474-6864f9cf17ab'),
  },
];

const GOLD = '#E8C547';

export interface CategoryShowcaseSectionProps {
  section?: HomeSection;
  categories?: ShowcaseCategory[];
}

export function CategoryShowcaseSection({
  section,
  categories = DEFAULT_CATEGORIES,
}: CategoryShowcaseSectionProps) {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((item) => item.id === activeId) ?? categories[0];

  if (!active) return null;

  return (
    <Section
      spacing="sm"
      className="bg-background"
      aria-label={section?.title ?? 'Shop by category'}
    >
      <div className="mx-auto grid w-full max-w-[1100px] items-center gap-6 px-4 sm:gap-8 sm:px-6 lg:grid-cols-[minmax(0,20rem)_minmax(12rem,1fr)_minmax(0,20rem)] lg:gap-10 lg:px-8 xl:max-w-[1180px] xl:grid-cols-[minmax(0,22rem)_minmax(14rem,1fr)_minmax(0,22rem)] xl:gap-12">
        <ShowcasePanel
          keySide="left"
          category={active}
          reduceMotion={Boolean(reduceMotion)}
          showLabel
        />

        <nav
          aria-label="Category showcase"
          className="lg:order-0 order-first flex flex-col items-center justify-center gap-3 py-2 text-center sm:gap-3.5 lg:gap-4"
        >
          {categories.map((category) => {
            const isActive = category.id === active.id;
            return (
              <Link
                key={category.id}
                to="/categories/$slug"
                params={{ slug: category.slug }}
                preload="intent"
                className={cn(
                  'font-display duration-250 text-lg font-semibold uppercase leading-snug tracking-[0.08em] transition-colors sm:text-xl lg:text-[1.35rem] xl:text-[1.5rem]',
                  isActive ? 'text-[#E8C547]' : 'text-foreground hover:text-[#E8C547]',
                )}
                style={isActive ? { color: GOLD } : undefined}
                onMouseEnter={() => setActiveId(category.id)}
                onFocus={() => setActiveId(category.id)}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        <ShowcasePanel keySide="right" category={active} reduceMotion={Boolean(reduceMotion)} />
      </div>
    </Section>
  );
}

function ShowcasePanel({
  category,
  keySide,
  reduceMotion,
  showLabel = false,
}: {
  category: ShowcaseCategory;
  keySide: 'left' | 'right';
  reduceMotion: boolean;
  showLabel?: boolean;
}) {
  const src = keySide === 'left' ? category.leftImage : category.rightImage;

  return (
    <div className="bg-muted aspect-3/4 relative mx-auto w-full max-w-[20rem] overflow-hidden rounded-2xl sm:rounded-[1.35rem] lg:max-w-none xl:max-h-[30rem]">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={`${category.id}-${keySide}`}
          className="absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={src}
            alt={`${category.label} ${keySide}`}
            className="size-full object-cover"
            containerClassName="size-full rounded-none"
          />
        </motion.div>
      </AnimatePresence>

      {showLabel ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-4 left-1.5 z-10 flex items-center sm:left-3"
        >
          <span
            className={cn(
              'font-display rotate-180 font-bold uppercase leading-none tracking-tight text-white/35',
              'text-[clamp(1.2rem,2.4vw,2rem)] [writing-mode:vertical-rl]',
            )}
          >
            {category.label}
          </span>
        </span>
      ) : null}
    </div>
  );
}
