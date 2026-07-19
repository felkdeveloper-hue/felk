/**
 * TanStack Query key factory. Using factory functions (rather than plain
 * arrays) keeps cache invalidation call-sites type-safe and consistent.
 */
export const QUERY_KEYS = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  products: {
    all: () => ['products'] as const,
    list: (params?: unknown) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    relationships: (productId: string, type?: string) =>
      ['products', productId, 'relationships', type] as const,
    variants: (productId: string) => ['products', productId, 'variants'] as const,
    media: (productId: string) => ['products', productId, 'media'] as const,
    reviews: (productId: string, params?: unknown) =>
      ['products', productId, 'reviews', params] as const,
    reviewEligibility: (productId: string) =>
      ['products', productId, 'reviews', 'eligibility'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
    list: (params?: unknown) => ['categories', 'list', params] as const,
    tree: () => ['categories', 'tree'] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  customers: {
    me: () => ['customers', 'me'] as const,
    preferences: () => ['customers', 'me', 'preferences'] as const,
    addresses: () => ['customers', 'me', 'addresses'] as const,
    wishlists: () => ['customers', 'me', 'wishlists'] as const,
    wishlist: (id: string) => ['customers', 'me', 'wishlists', id] as const,
    recentlyViewed: () => ['customers', 'me', 'recently-viewed'] as const,
    savedItems: () => ['customers', 'me', 'saved-items'] as const,
    rewards: () => ['customers', 'me', 'rewards'] as const,
    referrals: () => ['customers', 'me', 'referrals'] as const,
  },
  cart: {
    current: () => ['cart'] as const,
  },
  checkout: {
    detail: (id: string) => ['checkout', id] as const,
  },
  payments: {
    list: (params?: unknown) => ['payments', 'list', params] as const,
    detail: (id: string) => ['payments', 'detail', id] as const,
    status: (checkoutToken: string) => ['payments', 'status', checkoutToken] as const,
  },
  orders: {
    list: (params?: unknown) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    byNumber: (orderNumber: string) => ['orders', 'number', orderNumber] as const,
    timeline: (id: string) => ['orders', id, 'timeline'] as const,
    invoice: (id: string) => ['orders', id, 'invoice'] as const,
    returns: (id: string) => ['orders', id, 'returns'] as const,
    customerReturns: () => ['orders', 'customer-returns'] as const,
  },
  inventory: {
    items: (params?: unknown) => ['inventory', 'items', params] as const,
    item: (id: string) => ['inventory', 'items', id] as const,
    warehouses: (params?: unknown) => ['inventory', 'warehouses', params] as const,
  },
  cms: {
    settingsPublic: () => ['cms', 'settings', 'public'] as const,
    pages: (params?: unknown) => ['cms', 'pages', params] as const,
    page: (slug: string) => ['cms', 'pages', slug] as const,
    faqs: (params?: unknown) => ['cms', 'faqs', params] as const,
    heroBanners: (params?: unknown) => ['cms', 'hero-banners', params] as const,
    promoBanners: (params?: unknown) => ['cms', 'promo-banners', params] as const,
    announcements: (params?: unknown) => ['cms', 'announcements', params] as const,
    homeSections: (params?: unknown) => ['cms', 'home-sections', params] as const,
    brands: (params?: unknown) => ['cms', 'brands', params] as const,
    collections: (params?: unknown) => ['cms', 'collections', params] as const,
    socialLinks: (params?: unknown) => ['cms', 'social-links', params] as const,
    contactInfos: (params?: unknown) => ['cms', 'contact-infos', params] as const,
    blogs: (params?: unknown) => ['cms', 'blogs', params] as const,
    blog: (id: string) => ['cms', 'blogs', id] as const,
    blogCategories: (params?: unknown) => ['cms', 'blog-categories', params] as const,
  },
} as const;
