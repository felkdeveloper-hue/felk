import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHeroBanners } from '@/hooks/cms';
import { CmsLink } from '@/components/common/cms-link';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import type { HeroBanner } from '@/services/sdk/cms';
import { AsyncSection } from './async-section';
import { HeroSkeleton } from './section-skeleton';

function HeroSlide({ banner }: { banner: HeroBanner }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-foreground relative min-h-[100svh] overflow-hidden">
      {banner.imageUrl ? (
        <motion.div
          className="absolute inset-0"
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            className="absolute inset-0 h-full w-full object-cover"
            containerClassName="absolute inset-0"
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

      <Container className="relative flex min-h-[100svh] flex-col justify-end pb-24 sm:pb-28 lg:pb-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl space-y-5 text-white"
        >
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
              <Button asChild size="lg" className="text-foreground bg-white px-8 hover:bg-white/90">
                <CmsLink href={banner.linkUrl!}>
                  {banner.ctaLabel ?? 'Shop now'}
                  <ArrowRight />
                </CmsLink>
              </Button>
            </div>
          ) : null}
        </motion.div>
      </Container>
    </div>
  );
}

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = banners[Math.min(index, Math.max(banners.length - 1, 0))];

  useEffect(() => {
    if (banners.length < 2 || reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [banners.length, reduceMotion]);

  if (!active) return null;

  return (
    <section aria-label="Hero" className="relative -mt-16 lg:-mt-[4.75rem]">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id ?? active.title}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <HeroSlide banner={active} />
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 ? (
        <>
          <div className="absolute inset-y-0 left-3 right-3 z-10 hidden items-center justify-between md:flex">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Previous slide"
              className="rounded-full bg-white/90"
              onClick={() => setIndex((current) => (current - 1 + banners.length) % banners.length)}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Next slide"
              className="rounded-full bg-white/90"
              onClick={() => setIndex((current) => (current + 1) % banners.length)}
            >
              <ChevronRight />
            </Button>
          </div>
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
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function HeroBannerSection() {
  const { data, isLoading, isError, error, refetch } = useHeroBanners();
  const banners = data?.data ?? [];

  return (
    <AsyncSection
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={banners}
      isEmpty={(value) => !value?.length}
      onRetry={() => void refetch()}
      skeleton={<HeroSkeleton />}
      emptyTitle="Welcome"
      emptyDescription="Our latest collection is coming soon."
    >
      {(items) => <HeroCarousel banners={items} />}
    </AsyncSection>
  );
}
