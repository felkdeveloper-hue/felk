/**
 * JSON-LD (schema.org) structured data builders for SEO. Consume the
 * returned object with `JSON.stringify` inside a `<script type="application/ld+json">`
 * tag rendered via `react-helmet-async`.
 */

export interface JsonLdOrganization {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
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
}

export interface JsonLdWebsite {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

export function buildOrganizationJsonLd(input: {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
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
}): JsonLdWebsite {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
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
            priceCurrency: input.currency ?? 'USD',
            availability: input.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: input.url,
          },
        }
      : {}),
  };
}

/** Serialize any JSON-LD object for use in a `<script>` tag. */
export function toJsonLdScript(value: object): string {
  return JSON.stringify(value);
}
