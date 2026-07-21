import { Link } from '@tanstack/react-router';
import midBannerSummer from '@/assets/images/Crousel Image/mid-banner-summer.webp';
import midBannerSummerMobile from '@/assets/images/Crousel Image/mid-banner-summer-mobile.webp';
import preFeaturedBanner from '@/assets/images/Crousel Image/pre-featured-banner.webp';
import preFeaturedBannerMobile from '@/assets/images/Crousel Image/pre-featured-banner-mobile.webp';
import { MotionReveal } from './motion-reveal';

type HomeStripBannerProps = {
  src: string;
  /** Portrait art for screens below `md` (767px). */
  mobileSrc?: string;
  alt: string;
  ariaLabel: string;
  categorySlug?: string;
};

function HomeStripBanner({
  src,
  mobileSrc,
  alt,
  ariaLabel,
  categorySlug = 'women',
}: HomeStripBannerProps) {
  return (
    <section aria-label={ariaLabel} className="w-full py-0">
      <MotionReveal>
        <Link
          to="/categories/$slug"
          params={{ slug: categorySlug }}
          preload="intent"
          className="group relative block w-full overflow-hidden"
        >
          <div
            className={
              mobileSrc
                ? 'relative aspect-[3/4] min-h-[18rem] w-full md:aspect-[21/9] md:min-h-[12rem] lg:min-h-[14rem]'
                : 'relative aspect-[21/9] min-h-[9.5rem] w-full sm:min-h-[12rem] lg:min-h-[14rem]'
            }
          >
            <picture className="absolute inset-0 block h-full w-full">
              {mobileSrc ? <source media="(max-width: 767px)" srcSet={mobileSrc} /> : null}
              <img
                src={src}
                alt={alt}
                width={1920}
                height={mobileSrc ? 2560 : 823}
                sizes={mobileSrc ? '(max-width: 767px) 100vw, 100vw' : '100vw'}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
        </Link>
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
      alt="Summer vibes — shop the women's collection"
      ariaLabel="Summer vibes"
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
    />
  );
}
