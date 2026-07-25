import bottomsImage from '@/assets/images/Crousel Image/bottoms.webp';
import bottomsImageMobile from '@/assets/images/Crousel Image/bottoms-mobile.webp';
import topsImage from '@/assets/images/Crousel Image/tops.webp';
import topsImageMobile from '@/assets/images/Crousel Image/tops-mobile.webp';
import { usePromoBanners } from '@/hooks/cms';
import type { PromoBanner } from '@/services/sdk/cms';
import { FashionPromoBanner } from './fashion-promo-banner';

type LocalPromoBanner = PromoBanner & { mobileImageUrl?: string };

const FALLBACK_SPLIT: LocalPromoBanner[] = [
  {
    id: 'local-split-bottoms',
    title: 'Bottoms',
    imageUrl: bottomsImage,
    mobileImageUrl: bottomsImageMobile,
    linkUrl: '/categories/all-bottoms',
    ctaLabel: 'Shop Now',
    placement: 'home_split',
    priority: 20,
  },
  {
    id: 'local-split-tops',
    title: 'Tops',
    imageUrl: topsImage,
    mobileImageUrl: topsImageMobile,
    linkUrl: '/categories/all-tops',
    ctaLabel: 'Shop Now',
    placement: 'home_split',
    priority: 10,
  },
];

function resolveSplitBanners(cmsBanners: PromoBanner[]): LocalPromoBanner[] {
  const sorted = [...cmsBanners].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return FALLBACK_SPLIT.map((fallback, index) => {
    const cms = sorted[index];
    if (!cms) return fallback;
    return {
      ...fallback,
      id: cms.id || fallback.id,
      title: cms.title || fallback.title,
      subtitle: cms.subtitle || fallback.subtitle,
      linkUrl: cms.linkUrl || fallback.linkUrl,
      ctaLabel: cms.ctaLabel || fallback.ctaLabel,
      imageUrl: cms.imageUrl || fallback.imageUrl,
      mobileImageUrl: cms.imageUrl ? undefined : fallback.mobileImageUrl,
      priority: cms.priority ?? fallback.priority,
    };
  });
}

/**
 * Zero-gap dual banners — same full viewport height as hero / editorial.
 */
export function HomeSplitBannersSection() {
  const { data } = usePromoBanners('home_split');
  const banners = resolveSplitBanners(data?.data ?? []);

  return (
    <section aria-label="Shop by category" className="grid w-full grid-cols-1 sm:grid-cols-2">
      {banners.map((banner, index) => (
        <FashionPromoBanner
          key={banner.id}
          size="full"
          title={banner.title}
          eyebrow={banner.subtitle}
          ctaLabel={banner.ctaLabel ?? 'Shop Now'}
          href={
            banner.linkUrl ?? (index === 0 ? '/categories/all-bottoms' : '/categories/all-tops')
          }
          imageSrc={banner.imageUrl ?? (index === 0 ? bottomsImage : topsImage)}
          mobileImageSrc={banner.mobileImageUrl}
          imageAlt={banner.title}
          imageClassName={index === 0 ? 'object-[62%_35%]' : 'object-[68%_30%]'}
        />
      ))}
    </section>
  );
}
