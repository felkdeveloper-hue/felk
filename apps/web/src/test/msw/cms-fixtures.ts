import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

const paginated = <T>(data: T[]) =>
  HttpResponse.json({
    success: true,
    data,
    meta: {
      page: 1,
      limit: 50,
      total: data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  });

export const cmsFixtures = {
  settings: [
    { key: 'store.name', value: 'Atelier', group: 'store' },
    { key: 'store.description', value: 'Considered clothing, made to last.', group: 'store' },
    { key: 'newsletter.title', value: 'Join the Atelier list', group: 'general' },
    {
      key: 'newsletter.description',
      value: 'Early access to drops and private sale invitations.',
      group: 'general',
    },
    { key: 'newsletter.enabled', value: true, group: 'general' },
  ],
  announcements: [
    {
      id: 'ann_1',
      message: 'Complimentary shipping on orders over $150',
      linkUrl: '/products',
      linkLabel: 'Shop now',
      priority: 1,
      status: 'active',
    },
  ],
  heroBanners: [
    {
      id: 'hero_1',
      title: 'Spring / Summer 2026',
      subtitle: 'New Season · Tailored ease for warmer days',
      images: {
        desktop: { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600' },
      },
      ctaUrl: '/products',
      ctaLabel: 'Explore the collection',
      priority: 1,
      status: 'active',
    },
  ],
  homeSections: [
    {
      id: 'hs_1',
      key: 'featured_collections',
      title: 'Featured collections',
      sortOrder: 1,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_2',
      key: 'featured_categories',
      title: 'Featured categories',
      sortOrder: 2,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_3',
      key: 'trending_products',
      title: 'Trending products',
      sortOrder: 3,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_4',
      key: 'best_sellers',
      title: 'Best sellers',
      sortOrder: 4,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_5',
      key: 'new_arrivals',
      title: 'New arrivals',
      sortOrder: 5,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_6',
      key: 'featured_brands',
      title: 'Featured brands',
      sortOrder: 6,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_7',
      key: 'promotional_banner',
      title: 'Archive sale',
      sortOrder: 7,
      status: 'active',
      content: { placement: 'home' },
    },
    {
      id: 'hs_8',
      key: 'editorial',
      title: 'The making of a silhouette',
      sortOrder: 8,
      status: 'active',
      content: {
        description: 'An inside look at our atelier process.',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
        ctaUrl: '/about',
        ctaLabel: 'Read the story',
      },
    },
    {
      id: 'hs_9',
      key: 'newsletter',
      title: 'Newsletter',
      sortOrder: 9,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_10',
      key: 'social_gallery',
      title: 'Social gallery',
      sortOrder: 10,
      status: 'active',
      content: {
        images: [
          'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
          'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600',
        ],
      },
    },
    {
      id: 'hs_11',
      key: 'trust_features',
      title: 'Trust & quality',
      sortOrder: 11,
      status: 'active',
      content: {
        features: [
          { label: 'Complimentary shipping', value: 48, suffix: 'hr dispatch', icon: 'truck' },
        ],
      },
    },
    {
      id: 'hs_12',
      key: 'customer_reviews',
      title: 'Customer reviews',
      sortOrder: 12,
      status: 'active',
      content: {
        reviews: [
          {
            id: 'r1',
            author: 'Amelia R.',
            quote: 'Impeccable quality and fast delivery.',
            rating: 5,
          },
        ],
      },
    },
    {
      id: 'hs_13',
      key: 'faq_preview',
      title: 'Questions, answered',
      sortOrder: 13,
      status: 'active',
      content: {},
    },
  ],
  pages: [
    {
      id: 'p_about',
      slug: 'about',
      title: 'About Atelier',
      content: '<p>We design timeless wardrobe essentials.</p>',
      excerpt: 'Our story',
      status: 'published',
    },
    {
      id: 'p_contact',
      slug: 'contact',
      title: 'Contact',
      content: '<p>Reach out to our customer care team.</p>',
      excerpt: 'We are here to help',
      status: 'published',
    },
    {
      id: 'p_privacy',
      slug: 'privacy',
      title: 'Privacy Policy',
      content: '<p>Your privacy matters to us.</p>',
      status: 'published',
    },
    {
      id: 'p_terms',
      slug: 'terms',
      title: 'Terms of Service',
      content: '<p>Terms for using our website.</p>',
      status: 'published',
    },
  ],
  faqs: [
    {
      id: 'faq_1',
      question: 'How long does shipping take?',
      answer: 'Most orders ship within 48 hours.',
      status: 'active',
    },
    {
      id: 'faq_2',
      question: 'What is your return policy?',
      answer: 'Returns are accepted within 30 days.',
      status: 'active',
    },
  ],
  collections: [
    {
      id: 'col_1',
      name: 'Resort Edit',
      slug: 'resort-edit',
      description: 'Lightweight layers',
      image: { url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800' },
      status: 'active',
    },
  ],
  categories: [
    {
      id: 'cat_1',
      name: 'Dresses',
      slug: 'dresses',
      image: { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600' },
      status: 'active',
    },
  ],
  brands: [{ id: 'brand_1', name: 'Atelier Studio', slug: 'atelier-studio', status: 'active' }],
  socialLinks: [
    { id: 'soc_1', platform: 'instagram', url: 'https://instagram.com', status: 'active' },
  ],
  contactInfos: [
    {
      id: 'ci_1',
      label: 'Email',
      type: 'email',
      value: 'hello@atelier.example',
      isPrimary: true,
      status: 'active',
    },
  ],
  promoBanners: [
    {
      id: 'promo_1',
      title: 'Archive sale — up to 40% off',
      subtitle: 'Limited time on selected styles',
      placement: 'home',
      images: {
        desktop: { url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400' },
      },
      ctaUrl: '/products',
      ctaLabel: 'Shop sale',
      status: 'active',
    },
  ],
  products: [
    {
      id: 'prod_1',
      name: 'Silk Column Dress',
      slug: 'silk-column-dress',
      status: 'active',
      price: { amount: 420, currency: 'USD' },
      media: [
        {
          id: 'm1',
          url: 'https://images.unsplash.com/photo-1595777457583-95e059d58199?w=800',
          alt: 'Silk Column Dress',
          isPrimary: true,
        },
      ],
    },
  ],
};

export const cmsHandlers = [
  http.get(`${API}/cms/settings/public`, () =>
    HttpResponse.json({ success: true, data: cmsFixtures.settings }),
  ),
  http.get(`${API}/cms/announcements`, () => paginated(cmsFixtures.announcements)),
  http.get(`${API}/cms/hero-banners`, () => paginated(cmsFixtures.heroBanners)),
  http.get(`${API}/cms/home-sections`, () => paginated(cmsFixtures.homeSections)),
  http.get(`${API}/cms/pages`, () => paginated(cmsFixtures.pages)),
  http.get(`${API}/cms/faqs`, () => paginated(cmsFixtures.faqs)),
  http.get(`${API}/cms/collections`, () => paginated(cmsFixtures.collections)),
  http.get(`${API}/cms/categories`, () => paginated(cmsFixtures.categories)),
  http.get(`${API}/cms/brands`, () => paginated(cmsFixtures.brands)),
  http.get(`${API}/cms/social-links`, () => paginated(cmsFixtures.socialLinks)),
  http.get(`${API}/cms/contact-infos`, () => paginated(cmsFixtures.contactInfos)),
  http.get(`${API}/cms/promo-banners`, () => paginated(cmsFixtures.promoBanners)),
  http.get(`${API}/catalog/products`, () => paginated(cmsFixtures.products)),
];
