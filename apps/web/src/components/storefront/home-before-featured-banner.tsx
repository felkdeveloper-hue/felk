import shopForLookImage from '@/assets/images/Crousel Image/shop-for-look.webp';
import shopForLookImageMobile from '@/assets/images/Crousel Image/shop-for-look-mobile.webp';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { FashionPromoBanner } from './fashion-promo-banner';

/** Placement key used in admin + storefront CMS queries. */
export const HOME_BEFORE_FEATURED_PLACEMENT = 'home_before_featured';

type LocalPromoBanner = PromoBanner & { mobileImageUrl?: string };

const FALLBACK: LocalPromoBanner = {
  id: 'local-before-featured',
  title: 'Shop For Look',
  subtitle: 'Effortless. Stylish. You.',
  imageUrl: shopForLookImage,
  mobileImageUrl: shopForLookImageMobile,
  linkUrl: '/products?gender=women',
  ctaLabel: 'Shop Now',
  placement: HOME_BEFORE_FEATURED_PLACEMENT,
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
    mobileImageUrl: cms.imageUrl ? undefined : FALLBACK.mobileImageUrl,
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
        eyebrow={banner.subtitle}
        title={banner.title}
        ctaLabel={banner.ctaLabel ?? 'Shop Now'}
        href={banner.linkUrl ?? '/products?gender=women'}
        imageSrc={banner.imageUrl ?? shopForLookImage}
        mobileImageSrc={banner.mobileImageUrl}
        imageAlt={banner.title}
        imageClassName="object-[center_30%]"
      />
    </section>
  );
}
