import midBannerSummer from '@/assets/images/Crousel Image/mid-banner-summer.webp';
import midBannerSummerMobile from '@/assets/images/Crousel Image/mid-banner-summer-mobile.webp';
import { CmsLink } from '@/components/common/cms-link';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { cn } from '@/lib/utils';

/** Placement key — Admin → Banners → After Best Sellers. */
export const HOME_AFTER_BEST_SELLERS_PLACEMENT = 'home_after_best_sellers';

type LocalPromoBanner = PromoBanner & { mobileImageUrl?: string };

const FALLBACK: LocalPromoBanner = {
  id: 'local-after-best-sellers',
  title: 'Fashion Edge',
  subtitle: 'Modern fashion for every day',
  imageUrl: midBannerSummer,
  mobileImageUrl: midBannerSummerMobile,
  linkUrl: '/products?gender=women',
  ctaLabel: 'Shop Now',
  placement: HOME_AFTER_BEST_SELLERS_PLACEMENT,
  priority: 10,
};

function resolveBanner(cmsBanners: PromoBanner[]): LocalPromoBanner {
  const cms = [...cmsBanners].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (!cms) return FALLBACK;
  return {
    ...FALLBACK,
    id: cms.id || FALLBACK.id,
    title: cms.title || FALLBACK.title,
    subtitle: cms.subtitle || FALLBACK.subtitle,
    linkUrl: cms.linkUrl || FALLBACK.linkUrl,
    ctaLabel: cms.ctaLabel || FALLBACK.ctaLabel,
    imageUrl: cms.imageUrl || FALLBACK.imageUrl,
    // When CMS has an image, use it for both breakpoints unless a separate mobile is provided later.
    mobileImageUrl: cms.imageUrl ? undefined : FALLBACK.mobileImageUrl,
  };
}

/**
 * Full-width lifestyle banner between Best Sellers and New Arrivals.
 * Aspect / height matches the mid-page promo reference (img-2).
 * Managed in Admin → Banners → After Best Sellers.
 */
export function HomeAfterBestSellersBannerSection() {
  const { data } = usePromoBanners(HOME_AFTER_BEST_SELLERS_PLACEMENT);
  const banner = resolveBanner(data?.data ?? []);
  const href = banner.linkUrl ?? '/products?gender=women';

  return (
    <section aria-label="Promotional banner" className="w-full">
      <CmsLink
        href={href}
        className={cn(
          'relative block w-full overflow-hidden bg-zinc-900',
          // Mobile: substantial landscape block like the reference; desktop slightly wider.
          'aspect-[5/4] min-h-[14rem] sm:aspect-[21/9] sm:min-h-[16rem] lg:min-h-[18rem]',
        )}
      >
        <picture>
          {banner.mobileImageUrl ? (
            <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />
          ) : null}
          <img
            src={banner.imageUrl ?? midBannerSummer}
            alt={banner.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/20"
        />

        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center">
          <h2 className="font-display text-3xl font-bold uppercase tracking-[0.08em] text-white sm:text-4xl lg:text-5xl">
            {banner.title}
          </h2>
          {banner.subtitle ? (
            <p className="mt-2 max-w-md font-serif text-sm italic text-white/90 sm:text-base">
              {banner.subtitle}
            </p>
          ) : null}
        </div>
      </CmsLink>
    </section>
  );
}
