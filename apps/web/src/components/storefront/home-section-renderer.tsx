import { lazy, Suspense, type ReactNode } from 'react';
import { HOME_SECTION_KEYS } from '@/constants/storefront';
import type { HomeSection } from '@/services/sdk/cms';
import { ProductRailSection } from './product-rail';
import { SectionSkeleton } from './section-skeleton';

const FeaturedCollectionsSection = lazy(() =>
  import('./featured-collections').then((m) => ({ default: m.FeaturedCollectionsSection })),
);
const ShopYourMoodSection = lazy(() =>
  import('./shop-your-mood').then((m) => ({ default: m.ShopYourMoodSection })),
);
const FeaturedCategoriesSection = lazy(() =>
  import('./featured-categories').then((m) => ({ default: m.FeaturedCategoriesSection })),
);
const CategoryShowcaseSection = lazy(() =>
  import('./category-showcase').then((m) => ({ default: m.CategoryShowcaseSection })),
);
const FeaturedBrandsSection = lazy(() =>
  import('./featured-brands').then((m) => ({ default: m.FeaturedBrandsSection })),
);
const PromoBannerSection = lazy(() =>
  import('./promo-banner').then((m) => ({ default: m.PromoBannerSection })),
);
const EditorialSection = lazy(() =>
  import('./editorial-section').then((m) => ({ default: m.EditorialSection })),
);
const SocialGallerySection = lazy(() =>
  import('./social-gallery').then((m) => ({ default: m.SocialGallerySection })),
);
const TrustFeaturesSection = lazy(() =>
  import('./trust-features').then((m) => ({ default: m.TrustFeaturesSection })),
);
const CustomerReviewsSection = lazy(() =>
  import('./customer-reviews').then((m) => ({ default: m.CustomerReviewsSection })),
);
const FaqPreviewSection = lazy(() =>
  import('./faq-preview').then((m) => ({ default: m.FaqPreviewSection })),
);

function LazySection({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SectionSkeleton />}>{children}</Suspense>;
}

export interface HomeSectionRendererProps {
  section: HomeSection;
}

export function HomeSectionRenderer({ section }: HomeSectionRendererProps) {
  switch (section.key) {
    case HOME_SECTION_KEYS.featuredCollections:
      return (
        <LazySection>
          <FeaturedCollectionsSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.featuredCategories:
      return (
        <LazySection>
          <ShopYourMoodSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.trendingProducts:
      return (
        <LazySection>
          <ProductRailSection
            kind="trending"
            title={section.title}
            description={section.subtitle}
          />
        </LazySection>
      );
    case HOME_SECTION_KEYS.bestSellers:
      return (
        <LazySection>
          <CategoryShowcaseSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.newArrivals:
      return (
        <LazySection>
          <FeaturedCategoriesSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.featuredBrands:
      return (
        <LazySection>
          <FeaturedBrandsSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.promotionalBanner:
      return (
        <LazySection>
          <PromoBannerSection
            section={section}
            placement={(section.config?.placement as string) ?? 'home'}
          />
        </LazySection>
      );
    case HOME_SECTION_KEYS.editorial:
      return (
        <LazySection>
          <EditorialSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.newsletter:
      // Newsletter lives in the footer — skip the duplicate home-page block.
      return null;
    case HOME_SECTION_KEYS.socialGallery:
      return (
        <LazySection>
          <SocialGallerySection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.trustFeatures:
      return (
        <LazySection>
          <TrustFeaturesSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.customerReviews:
      return (
        <LazySection>
          <CustomerReviewsSection section={section} />
        </LazySection>
      );
    case HOME_SECTION_KEYS.faqPreview:
      return (
        <LazySection>
          <FaqPreviewSection section={section} />
        </LazySection>
      );
    default:
      return null;
  }
}
