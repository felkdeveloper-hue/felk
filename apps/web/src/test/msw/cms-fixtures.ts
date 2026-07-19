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
      title: 'Color, cut, confidence.',
      subtitle: 'THE NEW MODERN EDIT · Expressive pieces designed for every version of you.',
      images: {
        desktop: {
          url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=2200&h=1400&fit=crop',
        },
      },
      ctaUrl: '/products',
      ctaLabel: 'Explore the edit',
      priority: 30,
      status: 'active',
    },
    {
      id: 'hero_2',
      title: 'Quiet luxury, loud presence.',
      subtitle: 'ESSENTIAL LAYERING · Minimal silhouettes that still make an entrance.',
      images: {
        desktop: {
          url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=2200&h=1400&fit=crop',
        },
      },
      ctaUrl: '/products',
      ctaLabel: 'Shop essentials',
      priority: 20,
      status: 'active',
    },
    {
      id: 'hero_3',
      title: 'Weekend energy, elevated.',
      subtitle: 'OFF-DUTY EDIT · Easy pieces made for sunlit days and late nights.',
      images: {
        desktop: {
          url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2200&h=1400&fit=crop',
        },
      },
      ctaUrl: '/products',
      ctaLabel: 'Shop weekend',
      priority: 10,
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
      title: 'Shop your mood',
      subtitle: 'Four edits, one unmistakably modern point of view.',
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
      key: 'new_arrivals',
      title: 'Featured Categories',
      subtitle: 'Shop the edits that define the season.',
      sortOrder: 4,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_6',
      key: 'featured_brands',
      title: 'Featured brands',
      sortOrder: 5,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_7',
      key: 'promotional_banner',
      title: 'Archive sale',
      sortOrder: 6,
      status: 'active',
      content: { placement: 'home' },
    },
    {
      id: 'hs_8',
      key: 'editorial',
      title: 'The making of a silhouette',
      sortOrder: 7,
      status: 'active',
      content: {
        description: 'An inside look at our atelier process.',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
        ctaUrl: '/about',
        ctaLabel: 'Read the story',
      },
    },
    {
      id: 'hs_11',
      key: 'trust_features',
      title: 'Trust & quality',
      sortOrder: 8,
      status: 'active',
      content: {
        features: [
          { label: 'Complimentary shipping', value: 48, suffix: 'hr dispatch', icon: 'truck' },
        ],
      },
    },
    {
      id: 'hs_5',
      key: 'best_sellers',
      title: 'Shop categories',
      subtitle: 'Hover a category to preview the edit.',
      sortOrder: 9,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_9',
      key: 'newsletter',
      title: 'Your front-row invitation',
      sortOrder: 10,
      status: 'active',
      content: {},
    },
    {
      id: 'hs_10',
      key: 'social_gallery',
      title: 'Social gallery',
      sortOrder: 11,
      status: 'active',
      content: {
        images: [
          'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600',
          'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600',
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
      title: 'About',
      content:
        '<p>Fashion Edge is about stepping out of the ordinary with daring designs and standout pieces. Modern fashion for every day.</p>',
      excerpt: 'Our story',
      status: 'published',
    },
    {
      id: 'p_contact',
      slug: 'contact',
      title: 'Contact',
      content:
        '<p>Reach us at support@fe.lk or 081 220 4315. Flagship: No. 14, Kotugodella Veediya, Kandy.</p>',
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
      content: '<p>Terms for using fe.lk and Fashion Edge services.</p>',
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
    {
      id: 'soc_1',
      platform: 'facebook',
      url: 'https://www.facebook.com/fashionedge.lk/',
      status: 'active',
    },
    {
      id: 'soc_2',
      platform: 'instagram',
      url: 'https://www.instagram.com/fashion__edge__/',
      status: 'active',
    },
    {
      id: 'soc_3',
      platform: 'tiktok',
      url: 'https://www.tiktok.com/@fashion_edge_',
      status: 'active',
    },
  ],
  contactInfos: [
    {
      id: 'ci_1',
      label: 'Email',
      type: 'email',
      value: 'support@fe.lk',
      isPrimary: true,
      status: 'active',
    },
    {
      id: 'ci_2',
      label: 'Hotline',
      type: 'phone',
      value: '081 220 4315',
      isPrimary: false,
      status: 'active',
    },
    {
      id: 'ci_3',
      label: 'Flagship store',
      type: 'address',
      value: 'No. 14, Kotugodella Veediya, Kandy',
      isPrimary: false,
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
