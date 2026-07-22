import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import mainBanner1 from '@/assets/images/Crousel Image/banner1.webp';
import mainBanner2 from '@/assets/images/Crousel Image/banner2.webp';
import mainBanner3 from '@/assets/images/Crousel Image/banner3.webp';
import { useHeroBanners } from '@/hooks/cms';
import { ROUTES } from '@/constants';
import { CmsLink } from '@/components/common/cms-link';
import { Image } from '@/components/media/image';
import type { HeroBanner } from '@/services/sdk/cms';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTO_SLIDE_MS = 5000;

/** Always three slides — local hero art with optional CMS copy/CTA overlay. */
const FALLBACK_HERO_BANNERS: HeroBanner[] = [
  {
    id: 'local-main-banner-1',
    title: 'Out of Office',
    subtitle: 'Essentials, upgraded',
    imageUrl: mainBanner1,
    linkUrl: `${ROUTES.products}?gender=women`,
    ctaLabel: 'Shop Now',
  },
  {
    id: 'local-main-banner-2',
    title: 'Essential Bottoms',
    subtitle: 'The women’s edit',
    imageUrl: mainBanner2,
    linkUrl: `${ROUTES.products}?gender=women`,
    ctaLabel: 'Shop Now',
  },
  {
    id: 'local-main-banner-3',
    title: 'Everyday Style',
    subtitle: 'Made to wear on repeat',
    imageUrl: mainBanner3,
    linkUrl: `${ROUTES.products}?gender=women`,
    ctaLabel: 'Shop Now',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 1,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 1,
  }),
};

const DOT_SIZE = 14;
const DOT_STROKE = 1.5;
const DOT_RADIUS = (DOT_SIZE - DOT_STROKE) / 2;
const DOT_CIRCUMFERENCE = 2 * Math.PI * DOT_RADIUS;

function resolveHeroBanners(cmsBanners: HeroBanner[]): HeroBanner[] {
  return FALLBACK_HERO_BANNERS.map((fallback, index) => {
    const cms = cmsBanners[index];
    if (!cms) return fallback;
    return {
      ...fallback,
      id: cms.id || fallback.id,
      title: cms.title || fallback.title,
      subtitle: cms.subtitle || fallback.subtitle,
      linkUrl: cms.linkUrl || fallback.linkUrl,
      ctaLabel: cms.ctaLabel || fallback.ctaLabel,
      // Keep local carousel images so all 3 slides always show.
      imageUrl: fallback.imageUrl,
    };
  });
}

function HeroSlide({ banner }: { banner: HeroBanner }) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-zinc-950">
      {banner.imageUrl ? (
        <div className="absolute inset-0">
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            className="absolute inset-0 h-full w-full object-cover"
            containerClassName="absolute inset-0"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
      )}

      {/* Static readability gradient only — no hover lighten / scale */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/25" />

      <div className="relative flex min-h-[100svh] flex-col items-center justify-end px-6 pb-24 text-center sm:pb-28 lg:pb-32">
        {banner.subtitle ? (
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/85 sm:text-[11px]">
            {banner.subtitle}
          </p>
        ) : null}
        <h1 className="font-display max-w-5xl text-5xl font-bold uppercase leading-[0.9] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
          {banner.title}
        </h1>
        {banner.linkUrl ? (
          <CmsLink
            href={banner.linkUrl}
            data-radius="pill"
            className={cn(
              'shop-cta group/cta relative mt-7 inline-flex items-center justify-center overflow-hidden',
              'border border-white bg-transparent px-10 py-2.5',
              'text-[11px] font-bold uppercase tracking-[0.2em]',
              'focus-visible:outline-none',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 origin-top scale-y-0 bg-white',
                'transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'group-hover/cta:scale-y-100',
              )}
            />
            <span
              className={cn(
                'relative z-10 text-white',
                'transition-colors duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'group-hover/cta:text-zinc-950',
              )}
            >
              {banner.ctaLabel ?? 'Shop Now'}
            </span>
          </CmsLink>
        ) : null}
      </div>
    </div>
  );
}

function HeroDot({
  active,
  label,
  onClick,
  reduceMotion,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active}
      onClick={onClick}
      className="relative flex size-3.5 items-center justify-center"
      style={{ width: DOT_SIZE, height: DOT_SIZE }}
    >
      <span
        data-radius="soft"
        className={cn(
          'block size-1.5 transition-colors duration-300',
          active ? 'bg-white' : 'bg-white/45 hover:bg-white/70',
        )}
      />
      {active && !reduceMotion ? (
        <svg
          key="progress"
          className="pointer-events-none absolute inset-0 -rotate-90"
          width={DOT_SIZE}
          height={DOT_SIZE}
          viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`}
          aria-hidden
        >
          <circle
            cx={DOT_SIZE / 2}
            cy={DOT_SIZE / 2}
            r={DOT_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={DOT_STROKE}
          />
          <circle
            cx={DOT_SIZE / 2}
            cy={DOT_SIZE / 2}
            r={DOT_RADIUS}
            fill="none"
            stroke="white"
            strokeWidth={DOT_STROKE}
            strokeLinecap="square"
            className="hero-dot-progress"
            style={
              {
                '--hero-dot-c': DOT_CIRCUMFERENCE,
                '--hero-dot-duration': `${AUTO_SLIDE_MS}ms`,
              } as CSSProperties
            }
          />
        </svg>
      ) : active ? (
        <span data-radius="soft" className="absolute inset-0 border border-white/70" aria-hidden />
      ) : null}
    </button>
  );
}

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(-1);
  const reduceMotion = useReducedMotion();
  const active = banners[Math.min(index, Math.max(banners.length - 1, 0))];

  const goTo = (nextIndex: number, dir: 1 | -1) => {
    setDirection(dir);
    setIndex(nextIndex);
  };

  useEffect(() => {
    if (banners.length < 2 || reduceMotion) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % banners.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, reduceMotion, index]);

  if (!active) return null;

  return (
    <section aria-label="Hero" className="relative -mt-16 overflow-hidden lg:-mt-[4.75rem]">
      <div className="relative min-h-[100svh]">
        <AnimatePresence initial={!reduceMotion} custom={direction} mode="popLayout">
          <motion.div
            key={active.id ?? active.title}
            custom={direction}
            variants={reduceMotion ? undefined : slideVariants}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit={reduceMotion ? undefined : 'exit'}
            transition={{ duration: 0.9, ease: EASE }}
            className="absolute inset-0 w-full"
          >
            <HeroSlide banner={active} />
          </motion.div>
        </AnimatePresence>
      </div>

      {banners.length > 1 ? (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
          {banners.map((banner, dotIndex) => (
            <HeroDot
              key={`${banner.id ?? banner.title}-${dotIndex === index ? index : 'idle'}`}
              active={dotIndex === index}
              label={`Go to slide ${dotIndex + 1}`}
              reduceMotion={reduceMotion}
              onClick={() => goTo(dotIndex, dotIndex > index ? 1 : -1)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HeroBannerSection() {
  const { data } = useHeroBanners();
  const banners = resolveHeroBanners(data?.data ?? []);

  return <HeroCarousel banners={banners} />;
}
