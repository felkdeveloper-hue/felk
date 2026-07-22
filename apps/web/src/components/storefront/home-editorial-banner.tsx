import promoImage from '@/assets/images/Crousel Image/womenCrousel.png';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { FashionPromoBanner } from './fashion-promo-banner';

const FALLBACK_EDITORIAL: PromoBanner = {
  id: 'local-editorial',
  title: 'New Season',
  subtitle: 'The women’s edit',
  imageUrl: promoImage,
  linkUrl: '/products?gender=women',
  ctaLabel: 'Shop Now',
  placement: 'home_editorial',
  priority: 10,
};

function resolveEditorial(cmsBanners: PromoBanner[]): PromoBanner {
  const cms = [...cmsBanners].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (!cms) return FALLBACK_EDITORIAL;
  return {
    ...FALLBACK_EDITORIAL,
    id: cms.id || FALLBACK_EDITORIAL.id,
    title: cms.title || FALLBACK_EDITORIAL.title,
    subtitle: cms.subtitle || FALLBACK_EDITORIAL.subtitle,
    linkUrl: cms.linkUrl || FALLBACK_EDITORIAL.linkUrl,
    ctaLabel: cms.ctaLabel || FALLBACK_EDITORIAL.ctaLabel,
    imageUrl: cms.imageUrl || FALLBACK_EDITORIAL.imageUrl,
  };
}

/**
 * Full-viewport editorial banner under the split row — women’s collection.
 */
export function HomeEditorialBannerSection() {
  const { data } = usePromoBanners('home_editorial');
  const banner = resolveEditorial(data?.data ?? []);

  return (
    <section aria-label="Featured edit" className="w-full">
      <FashionPromoBanner
        size="full"
        eyebrow={banner.subtitle}
        title={banner.title}
        ctaLabel={banner.ctaLabel ?? 'Shop Now'}
        href={banner.linkUrl ?? '/products?gender=women'}
        imageSrc={banner.imageUrl ?? promoImage}
        imageAlt={banner.title}
        imageClassName="object-[center_22%]"
      />
    </section>
  );
}
