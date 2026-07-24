/**
 * Built-in + fashion-spec filter sections for PLPs (Bonkers Corner style).
 * Admins pick which keys appear per category under Edit Category.
 */
export type CatalogFacetKey =
  | 'availability'
  | 'price'
  | 'size'
  | 'category'
  | 'color'
  | 'brand'
  | 'material'
  | 'occasion'
  | 'discount'
  | 'fit'
  | 'neckline'
  | 'pattern'
  | 'sleeve-length'
  | 'length'
  | 'rise'
  | 'closure';

export interface CatalogFacetDefinition {
  key: CatalogFacetKey;
  label: string;
  /** Spec attribute name on product.specifications (fashion facets). */
  specName?: string;
  kind: 'system' | 'spec';
}

export const CATALOG_FACET_DEFINITIONS: CatalogFacetDefinition[] = [
  { key: 'availability', label: 'Availability', kind: 'system' },
  { key: 'price', label: 'Price', kind: 'system' },
  { key: 'size', label: 'Size', kind: 'system' },
  { key: 'category', label: 'Category', kind: 'system' },
  { key: 'color', label: 'Color', kind: 'system' },
  { key: 'brand', label: 'Brand', kind: 'system' },
  { key: 'material', label: 'Fabric', kind: 'system' },
  { key: 'occasion', label: 'Occasion', kind: 'system' },
  { key: 'discount', label: 'Discount', kind: 'system' },
  { key: 'fit', label: 'Fit', kind: 'spec', specName: 'Fit' },
  { key: 'neckline', label: 'Neck', kind: 'spec', specName: 'Neckline' },
  { key: 'pattern', label: 'Pattern', kind: 'spec', specName: 'Pattern' },
  { key: 'sleeve-length', label: 'Sleeve length', kind: 'spec', specName: 'Sleeve length' },
  { key: 'length', label: 'Length', kind: 'spec', specName: 'Length' },
  { key: 'rise', label: 'Rise', kind: 'spec', specName: 'Rise' },
  { key: 'closure', label: 'Closure', kind: 'spec', specName: 'Closure' },
];

/** Default facets when a category has none configured. */
export const DEFAULT_CATALOG_FACET_KEYS: CatalogFacetKey[] = [
  'availability',
  'price',
  'size',
  'category',
  'color',
  'material',
  'discount',
];

/** Suggested presets admins can apply quickly. */
export const CATALOG_FACET_PRESETS: Record<string, { label: string; keys: CatalogFacetKey[] }> = {
  tops: {
    label: 'Tops / Hoodies',
    keys: [
      'availability',
      'price',
      'size',
      'color',
      'fit',
      'neckline',
      'sleeve-length',
      'pattern',
      'material',
      'discount',
    ],
  },
  bottoms: {
    label: 'Jeans / Bottoms',
    keys: [
      'availability',
      'price',
      'size',
      'color',
      'fit',
      'rise',
      'length',
      'material',
      'discount',
    ],
  },
  default: {
    label: 'Default shop',
    keys: DEFAULT_CATALOG_FACET_KEYS,
  },
};

export function resolveFacetDefinition(key: string): CatalogFacetDefinition | undefined {
  return CATALOG_FACET_DEFINITIONS.find((item) => item.key === key);
}
