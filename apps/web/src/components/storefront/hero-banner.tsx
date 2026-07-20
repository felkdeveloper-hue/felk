import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import mainBanner1 from '@/assets/images/Crousel Image/banner1.png';
import mainBanner2 from '@/assets/images/Crousel Image/banner2.png';
import mainBanner3 from '@/assets/images/Crousel Image/banner3.png';
import { useHeroBanners } from '@/hooks/cms';
import { ROUTES } from '@/constants';
import { CmsLink } from '@/components/common/cms-link';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import type { HeroBanner } from '@/services/sdk/cms';
import { HeroSkeleton } from './section-skeleton';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Shown when CMS has no active hero banners yet. Rotates every 3s. */
const FALLBACK_HERO_BANNERS: HeroBanner[] = [
  {
    id: 'local-main-banner-1',
    title: 'New Edit',
    subtitle: 'FE · Modern fashion for every day',
    imageUrl: mainBanner1,
    linkUrl: ROUTES.products,
    ctaLabel: 'Shop now',
  },
  {
    id: 'local-main-banner-2',
    title: 'Shop the Look',
    subtitle: 'FE · Fresh styles for the season',
    imageUrl: mainBanner2,
    linkUrl: ROUTES.products,
    ctaLabel: 'Explore',
  },
  {
    id: 'local-main-banner-3',
    title: 'Everyday Style',
    subtitle: 'FE · Pieces made to wear on repeat',
    imageUrl: mainBanner3,
    linkUrl: ROUTES.products,
    ctaLabel: 'Shop now',
  },
];

/** direction > 0 → enter from right; direction < 0 → enter from left */
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

function HeroSlide({ banner }: { banner: HeroBanner }) {
  return (
    <div className="bg-foreground relative min-h-[100svh] overflow-hidden">
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

      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

      <Container className="relative flex min-h-[100svh] flex-col justify-end pb-24 sm:pb-28 lg:pb-32">
        <div className="max-w-4xl space-y-5 text-white">
          {banner.subtitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
              {banner.subtitle.includes('·')
                ? banner.subtitle.split('·')[0]?.trim()
                : banner.subtitle}
            </p>
          ) : null}
          <h1 className="font-display max-w-5xl text-5xl font-bold uppercase leading-[0.92] tracking-[-0.05em] sm:text-7xl lg:text-8xl 2xl:text-[7.5rem]">
            {banner.title}
          </h1>
          {banner.subtitle?.includes('·') ? (
            <p className="max-w-xl text-base text-white/80 sm:text-lg">
              {banner.subtitle.split('·').slice(1).join('·').trim()}
            </p>
          ) : null}
          {banner.linkUrl ? (
            <div className="pt-2">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/85 bg-transparent px-8 text-white hover:border-white hover:bg-white hover:text-zinc-950"
              >
                <CmsLink href={banner.linkUrl!}>
                  {banner.ctaLabel ?? 'Shop now'}
                  <ArrowRight />
                </CmsLink>
              </Button>
            </div>
          ) : null}
        </div>
      </Container>
    </div>
  );
}

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  /** -1 = from left (initial load); 1 = from right (next slides) */
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
    }, 3000);
    return () => window.clearInterval(timer);
  }, [banners.length, reduceMotion, index]);

  if (!active) return null;

  return (
    <section aria-label="Hero" className="relative -mt-16 overflow-hidden lg:-mt-[4.75rem]">
      <div className="relative min-h-[100svh]">
        <AnimatePresence initial={!reduceMotion} custom={direction}>
          <motion.div
            key={active.id ?? active.title}
            custom={direction}
            variants={reduceMotion ? undefined : slideVariants}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit={reduceMotion ? undefined : 'exit'}
            transition={{ duration: 0.75, ease: EASE }}
            className="absolute inset-0 w-full"
          >
            <HeroSlide banner={active} />
          </motion.div>
        </AnimatePresence>
      </div>

      {banners.length > 1 ? (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((banner, dotIndex) => (
            <button
              key={banner.id ?? banner.title}
              type="button"
              aria-label={`Go to slide ${dotIndex + 1}`}
              aria-current={dotIndex === index}
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/45'
              }`}
              onClick={() => goTo(dotIndex, dotIndex > index ? 1 : -1)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HeroBannerSection() {
  const { data, isLoading } = useHeroBanners();
  const cmsBanners = data?.data ?? [];
  const banners = cmsBanners.length > 0 ? cmsBanners : FALLBACK_HERO_BANNERS;

  if (isLoading) return <HeroSkeleton />;

  return <HeroCarousel banners={banners} />;
}
