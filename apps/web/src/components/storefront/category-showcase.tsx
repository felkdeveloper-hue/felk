import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/common/section';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import type { HomeSection } from '@/services/sdk/cms';

export interface ShowcaseCategory {
  id: string;
  label: string;
  slug: string;
  leftImage: string;
  rightImage: string;
}

/** Local product photos from Product image → public/catalog/women */
const PRODUCT_IMAGES = Array.from(
  { length: 24 },
  (_, index) => `/catalog/women/women-${String(index + 1).padStart(2, '0')}.jpg`,
);

const SHOWCASE_LABELS = [
  { id: 'sneakers', label: 'Sneakers', slug: 'shoes' },
  { id: 'active-shoes', label: 'Active Shoes', slug: 'shoes' },
  { id: 'adventure', label: 'Adventure', slug: 'essentials' },
  { id: 'belts-wallets', label: 'Belts & Wallets', slug: 'accessories' },
  { id: 'oversized-t-shirts', label: 'Oversized T-Shirts', slug: 'oversized' },
] as const;

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function buildCategoriesFromProductImages(): ShowcaseCategory[] {
  const pool = shuffle(PRODUCT_IMAGES);
  return SHOWCASE_LABELS.map((item, index) => ({
    ...item,
    leftImage: pool[index * 2] ?? PRODUCT_IMAGES[0]!,
    rightImage: pool[index * 2 + 1] ?? PRODUCT_IMAGES[1]!,
  }));
}

const GOLD = '#E8C547';

export interface CategoryShowcaseSectionProps {
  section?: HomeSection;
  categories?: ShowcaseCategory[];
}

export function CategoryShowcaseSection({
  section,
  categories: categoriesProp,
}: CategoryShowcaseSectionProps) {
  const reduceMotion = useReducedMotion();
  const categories = useMemo(
    () => categoriesProp ?? buildCategoriesFromProductImages(),
    [categoriesProp],
  );
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((item) => item.id === activeId) ?? categories[0];

  if (!active) return null;

  return (
    <Section
      spacing="default"
      className="bg-background"
      aria-label={section?.title ?? 'Shop by category'}
    >
      <div className="mx-auto grid w-full max-w-[1680px] items-center gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[minmax(0,34rem)_minmax(12rem,1fr)_minmax(0,34rem)] lg:gap-10 lg:px-8 xl:max-w-[1800px] xl:grid-cols-[minmax(0,38rem)_minmax(14rem,1fr)_minmax(0,38rem)] xl:gap-12">
        <ShowcasePanel
          keySide="left"
          category={active}
          reduceMotion={Boolean(reduceMotion)}
          showLabel
        />

        <nav
          aria-label="Category showcase"
          className="lg:order-0 order-first flex flex-col items-center justify-center gap-4 py-4 text-center sm:gap-5 lg:gap-6"
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
                  'font-display duration-250 text-xl font-semibold uppercase leading-snug tracking-[0.08em] transition-all sm:text-2xl lg:text-[1.65rem] xl:text-[1.85rem]',
                  isActive
                    ? 'scale-105 text-[#E8C547]'
                    : 'text-foreground hover:scale-105 hover:text-[#E8C547]',
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
    <div className="bg-muted aspect-3/4 relative mx-auto w-full max-w-[32rem] overflow-hidden rounded-2xl shadow-[var(--shadow-soft)] transition-shadow duration-500 hover:shadow-[var(--shadow-elevated)] sm:max-w-[36rem] sm:rounded-[1.5rem] lg:max-h-[50rem] lg:max-w-none xl:max-h-[52rem]">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={`${category.id}-${keySide}`}
          className="absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
          className="pointer-events-none absolute inset-y-5 left-2 z-10 flex items-center sm:left-4"
        >
          <span
            className={cn(
              'font-display rotate-180 font-bold uppercase leading-none tracking-tight text-white/40',
              'text-[clamp(1.4rem,2.8vw,2.4rem)] [writing-mode:vertical-rl]',
            )}
          >
            {category.label}
          </span>
        </span>
      ) : null}
    </div>
  );
}
