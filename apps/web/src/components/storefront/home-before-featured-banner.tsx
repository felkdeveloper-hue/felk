import promoImage from '@/assets/images/Crousel Image/womenCrousel.png';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { FashionPromoBanner } from './fashion-promo-banner';

/** Placement key used in admin + storefront CMS queries. */
export const HOME_BEFORE_FEATURED_PLACEMENT = 'home_before_featured';

const FALLBACK: PromoBanner = {
  id: 'local-before-featured',
  title: 'Shop the Look',
  subtitle: undefined,
  imageUrl: promoImage,
  linkUrl: '/products?gender=women',
  ctaLabel: 'Shop Now',
  placement: HOME_BEFORE_FEATURED_PLACEMENT,
  priority: 10,
};

function resolveBanner(cmsBanners: PromoBanner[]): PromoBanner {
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
  };
}

/**
 * Full-viewport promo banner shown just above Featured Products.
 * Managed in Admin → Banners → Before featured.
 */
export function HomeBeforeFeaturedBannerSection() {
  const { data } = usePromoBanners(HOME_BEFORE_FEATURED_PLACEMENT);
  const banner = resolveBanner(data?.data ?? []);

  return (
    <section aria-label="Promotional banner" className="w-full">
      <FashionPromoBanner
        size="full"
        title={banner.title}
        ctaLabel={banner.ctaLabel ?? 'Shop Now'}
        href={banner.linkUrl ?? '/products?gender=women'}
        imageSrc={banner.imageUrl ?? promoImage}
        imageAlt={banner.title}
        imageClassName="object-[center_30%]"
      />
    </section>
  );
}
