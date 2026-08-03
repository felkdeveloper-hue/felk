import { useEffect, useRef, useState } from 'react';
import allBottomwearBanner from '@/assets/images/Categories/all-bottomwear.webp';
import allBottomwearBannerMobile from '@/assets/images/Categories/all-bottomwear-mobile.webp';
import allTopwearBanner from '@/assets/images/Categories/all-topwear.webp';
import corsetBanner from '@/assets/images/Categories/corset-banner.webp';
import corsetBannerMobile from '@/assets/images/Categories/corset-banner-mobile.webp';
import jeansBanner from '@/assets/images/Categories/jeans-banner.webp';
import jeansBannerMobile from '@/assets/images/Categories/jeans-banner-mobile.webp';
import oversizedBanner from '@/assets/images/Categories/oversized-banner.webp';
import { cn } from '@/lib/utils';

type HeroArt = {
  desktop: string;
  mobile?: string;
  /** Campaign art already has title/tagline baked in — skip HTML copy. */
  bakedCopy?: boolean;
  objectClass?: string;
};

/** Curated campaign art keyed by gender or category slug. */
const HERO_FALLBACKS: Record<string, HeroArt> = {
  women: {
    desktop: allTopwearBanner,
    bakedCopy: true,
    objectClass: 'object-[70%_center]',
  },
  men: { desktop: '/catalog/women/women-14.jpg' },
  accessories: { desktop: '/catalog/categories/bags.png' },
  bags: { desktop: '/catalog/categories/bags.png' },
  'bags-wallets': { desktop: '/catalog/categories/bags.png' },
  hoodies: { desktop: '/catalog/categories/hoodies.png' },
  jackets: { desktop: '/catalog/categories/jackets.png' },
  jeans: {
    desktop: jeansBanner,
    mobile: jeansBannerMobile,
    bakedCopy: true,
    objectClass: 'object-[70%_center] md:object-[68%_center]',
  },
  'new-arrivals': { desktop: '/catalog/categories/new-arrivals.png' },
  oversized: {
    desktop: oversizedBanner,
    bakedCopy: true,
    objectClass: 'object-[75%_center]',
  },
  shoes: { desktop: '/catalog/categories/shoes.png' },
  corset: {
    desktop: corsetBanner,
    mobile: corsetBannerMobile,
    bakedCopy: true,
    objectClass: 'object-[68%_center]',
  },
  'all-topwear': {
    desktop: allTopwearBanner,
    bakedCopy: true,
    objectClass: 'object-[70%_center]',
  },
  'all-bottomwear': {
    desktop: allBottomwearBanner,
    mobile: allBottomwearBannerMobile,
    bakedCopy: true,
    objectClass: 'object-[72%_center]',
  },
};

/** Soft gradient backdrop when a category has no uploaded / curated banner. */
const DEFAULT_HERO: HeroArt = {
  desktop:
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a1a1a"/>
            <stop offset="55%" stop-color="#2c2c2c"/>
            <stop offset="100%" stop-color="#111111"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#g)"/>
      </svg>`,
    ),
  bakedCopy: false,
  objectClass: 'object-center',
};

/** One sentence taglines per scope (only used when art has no baked copy). */
const TAGLINES: Record<string, string> = {
  women: 'Essential layering · Minimal silhouettes that still make an entrance.',
  men: 'Clean cuts · Considered materials for the modern wardrobe.',
  accessories: 'Finish the look — bags, belts, and details that matter.',
  bags: 'Carry less. Choose better.',
  hoodies: 'Relaxed. Refined. Ready.',
  jackets: 'Outerwear worth keeping.',
  jeans: 'The right fit for every occasion.',
  shoes: 'Step out with intention.',
  oversized: 'Comfort without compromise.',
  corset: 'Shape. Style. Confidence.',
};

const MOBILE_MEDIA = '(max-width: 767px)';

export interface CatalogCategoryHeroProps {
  title: string;
  /** Slug or gender key used to pick the curated fallback. */
  scopeKey?: string;
  /** CMS-supplied image URL — only used when no curated campaign art exists. */
  imageUrl?: string | null;
  /** Short tagline. Auto-resolved from scopeKey when omitted. */
  tagline?: string;
  className?: string;
}

function resolveHeroArt(scopeKey?: string, imageUrl?: string | null): HeroArt {
  // Prefer admin-uploaded category / mega-menu banners over baked campaign art.
  const uploaded = imageUrl?.trim();
  if (uploaded) return { desktop: uploaded, bakedCopy: false };
  const curated = scopeKey ? HERO_FALLBACKS[scopeKey] : undefined;
  if (curated) return curated;
  return DEFAULT_HERO;
}

export function CatalogCategoryHero({
  title,
  scopeKey,
  imageUrl,
  tagline,
  className,
}: CatalogCategoryHeroProps) {
  const art = resolveHeroArt(scopeKey, imageUrl);
  const showCopy = !art.bakedCopy;
  const resolvedTagline = tagline ?? (scopeKey && showCopy ? TAGLINES[scopeKey] : undefined);

  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Reveal text on mount with a slight delay so it feels intentional. */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setLoaded(false);
  }, [art.desktop, art.mobile]);

  return (
    <section
      ref={ref}
      aria-label={`${title} banner`}
      className={cn(
        'relative h-[min(58vw,22rem)] w-full overflow-hidden sm:h-[38vw] sm:max-h-96 sm:min-h-52',
        className,
      )}
    >
      <picture>
        {art.mobile ? <source media={MOBILE_MEDIA} srcSet={art.mobile} /> : null}
        <img
          src={art.desktop}
          alt=""
          aria-hidden
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          className={cn(
            'duration-1200 absolute inset-0 h-full w-full object-cover transition-[opacity,transform] ease-out',
            art.objectClass,
            loaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
          )}
        />
      </picture>

      {/* Light readability veil — campaign art already carries its own type */}
      <div
        className={cn(
          'absolute inset-0',
          showCopy
            ? 'bg-linear-to-b from-black/50 via-black/30 to-black/70'
            : 'bg-linear-to-t from-black/25 via-transparent to-black/10',
        )}
      />

      {showCopy ? (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-end pb-10 text-white transition-[opacity,transform] duration-700 ease-out sm:pb-14',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
            FE Collection
          </p>
          <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-[-0.03em] sm:text-7xl">
            {title}
          </h1>
          {resolvedTagline ? (
            <p className="mt-4 max-w-md px-6 text-center text-xs tracking-wider text-white/60 sm:text-sm">
              {resolvedTagline}
            </p>
          ) : null}
        </div>
      ) : (
        <h1 className="sr-only">{title}</h1>
      )}
    </section>
  );
}
