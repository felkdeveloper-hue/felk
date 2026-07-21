import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import midBannerSummer from '@/assets/images/Crousel Image/mid-banner-summer.webp';
import midBannerSummerMobile from '@/assets/images/Crousel Image/mid-banner-summer-mobile.webp';
import preFeaturedBanner from '@/assets/images/Crousel Image/pre-featured-banner.webp';
import preFeaturedBannerMobile from '@/assets/images/Crousel Image/pre-featured-banner-mobile.webp';
import { ROUTES } from '@/constants';
import { Button } from '@/components/ui/button';
import { MotionReveal } from './motion-reveal';

type HomeStripBannerProps = {
  src: string;
  /** Portrait art for screens below `md` (767px). */
  mobileSrc?: string;
  alt: string;
  ariaLabel: string;
  eyebrow?: string;
  title: string;
  description?: string;
};

function BannerCopy({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-3 p-5 sm:p-6 md:inset-y-0 md:left-0 md:w-[min(100%,24rem)] md:justify-end md:bg-transparent md:p-8 lg:p-10">
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-[11px]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display max-w-[16rem] text-2xl font-bold uppercase leading-none tracking-tight text-white sm:text-3xl md:max-w-none md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-[18rem] text-sm text-white/85 sm:text-[15px]">{description}</p>
      ) : null}
      <Button asChild size="lg" className="mt-1 bg-white px-6 text-zinc-950 hover:bg-white/90">
        <Link to={ROUTES.products} preload="intent">
          Shop now
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function HomeStripBanner({
  src,
  mobileSrc,
  alt,
  ariaLabel,
  eyebrow,
  title,
  description,
}: HomeStripBannerProps) {
  return (
    <section aria-label={ariaLabel} className="w-full py-0">
      <MotionReveal>
        {/* Mobile: full-bleed portrait — height follows the image (no letterboxing) */}
        {mobileSrc ? (
          <div className="relative w-full overflow-hidden md:hidden">
            <img
              src={mobileSrc}
              alt={alt}
              width={900}
              height={1200}
              sizes="100vw"
              className="block h-auto w-full"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <BannerCopy eyebrow={eyebrow} title={title} description={description} />
          </div>
        ) : null}

        {/* Desktop / fallback: wide strip */}
        <div
          className={
            mobileSrc
              ? 'relative hidden aspect-[21/9] min-h-[14rem] w-full overflow-hidden md:block lg:min-h-[16rem]'
              : 'relative aspect-[21/9] min-h-[14rem] w-full overflow-hidden lg:min-h-[16rem]'
          }
        >
          <img
            src={src}
            alt={alt}
            width={1920}
            height={823}
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
          <BannerCopy eyebrow={eyebrow} title={title} description={description} />
        </div>
      </MotionReveal>
    </section>
  );
}

/** Second homepage banner — sits above the Categories grid. */
export function MidBannerSection() {
  return (
    <HomeStripBanner
      src={midBannerSummer}
      mobileSrc={midBannerSummerMobile}
      alt="Summer vibes — shop the collection"
      ariaLabel="Summer vibes"
      eyebrow="New season"
      title="Summer vibes"
      description="Light layers and easy looks for warmer days."
    />
  );
}

/** Third homepage banner — sits above Featured products. */
export function PreFeaturedBannerSection() {
  return (
    <HomeStripBanner
      src={preFeaturedBanner}
      mobileSrc={preFeaturedBannerMobile}
      alt="Summer vibes — shop featured products"
      ariaLabel="Summer vibes featured"
      eyebrow="Shop the edit"
      title="Fresh drops"
      description="The pieces defining this season’s wardrobe."
    />
  );
}
