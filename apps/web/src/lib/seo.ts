/**
 * JSON-LD (schema.org) structured data builders for SEO. Consume the
 * returned object with `JSON.stringify` inside a `<script type="application/ld+json">`
 * tag rendered via `react-helmet-async`.
 */

export interface JsonLdOrganization {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  alternateName?: string[];
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  email?: string;
  telephone?: string;
  address?: object | object[];
}

export interface JsonLdBreadcrumbList {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface JsonLdProductOffer {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
  availability: string;
  url?: string;
}

export interface JsonLdProduct {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string[];
  sku?: string;
  brand?: { '@type': 'Brand'; name: string };
  offers?: JsonLdProductOffer;
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    reviewCount: string;
  };
}

export interface JsonLdWebsite {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  alternateName?: string[];
  url: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

export interface JsonLdStore {
  '@context': 'https://schema.org';
  '@type': 'ClothingStore';
  name: string;
  url: string;
  image?: string;
  telephone?: string | string[];
  address?: object | object[];
  sameAs?: string[];
  priceRange?: string;
  openingHours?: string;
}

export function buildOrganizationJsonLd(input: {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  email?: string;
  telephone?: string;
  address?: object | object[];
  alternateName?: string[];
}): JsonLdOrganization {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...input,
  };
}

export function buildWebsiteJsonLd(input: {
  name: string;
  url: string;
  searchUrlTemplate?: string;
  alternateName?: string[];
}): JsonLdWebsite {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    ...(input.alternateName ? { alternateName: input.alternateName } : {}),
    ...(input.searchUrlTemplate
      ? {
          potentialAction: {
            '@type': 'SearchAction',
            target: input.searchUrlTemplate,
            'query-input': 'required name=search_term_string',
          },
        }
      : {}),
  };
}

export function buildStoreJsonLd(input: {
  name: string;
  url: string;
  image?: string;
  telephone?: string | string[];
  address?: object | object[];
  sameAs?: string[];
  priceRange?: string;
}): JsonLdStore {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    ...input,
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>,
): JsonLdBreadcrumbList {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildProductJsonLd(input: {
  name: string;
  description?: string;
  images?: string[];
  sku?: string;
  brand?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  url?: string;
  ratingValue?: number;
  reviewCount?: number;
}): JsonLdProduct {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.images,
    sku: input.sku,
    ...(input.brand ? { brand: { '@type': 'Brand', name: input.brand } } : {}),
    ...(input.price !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price: input.price.toFixed(2),
            priceCurrency: input.currency ?? 'LKR',
            availability: input.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: input.url,
          },
        }
      : {}),
    ...(input.ratingValue && input.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.ratingValue.toFixed(1),
            reviewCount: String(input.reviewCount),
          },
        }
      : {}),
  };
}

/** Serialize any JSON-LD object for use in a `<script>` tag. */
export function toJsonLdScript(value: object): string {
  return JSON.stringify(value);
}

/** Default Fashion Edge brand SEO keywords. */
export const FE_SEO_KEYWORDS = [
  'fashion edge',
  'fe',
  'FE',
  'fe.lk',
  'FE cloth website',
  'Fashion Edge Sri Lanka',
  'online fashion Sri Lanka',
  'clothing store Kandy',
  'women clothing Sri Lanka',
  'women fashion Colombo',
].join(', ');
