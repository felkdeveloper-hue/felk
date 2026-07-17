/** Home section keys mapped from CMS `home_sections.key`. */
export const HOME_SECTION_KEYS = {
  featuredCollections: 'featured_collections',
  featuredCategories: 'featured_categories',
  trendingProducts: 'trending_products',
  bestSellers: 'best_sellers',
  newArrivals: 'new_arrivals',
  featuredBrands: 'featured_brands',
  promotionalBanner: 'promotional_banner',
  editorial: 'editorial',
  newsletter: 'newsletter',
  socialGallery: 'social_gallery',
  trustFeatures: 'trust_features',
  customerReviews: 'customer_reviews',
  faqPreview: 'faq_preview',
} as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[keyof typeof HOME_SECTION_KEYS];
