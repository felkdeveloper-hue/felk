import { ProductRailSection } from '@/components/storefront/product-rail';

export interface CatalogHighlightRailsProps {
  categoryId?: string;
  gender?: string;
  /** Prefix section titles, e.g. "Women" → "Women new arrivals". */
  collectionLabel?: string;
}

/** New uploads + best sellers shown above the full catalog grid. */
export function CatalogHighlightRails({
  categoryId,
  gender,
  collectionLabel,
}: CatalogHighlightRailsProps) {
  const scope = { categoryId, gender, newestUploads: true as const };
  const label = collectionLabel?.trim();

  return (
    <div className="border-border/50 border-b">
      <ProductRailSection
        kind="new-arrivals"
        scope={scope}
        hideWhenEmpty
        eyebrow="Just uploaded"
        title={label ? `${label} new arrivals` : 'New arrivals'}
        description="The latest pieces added to this collection."
      />
      <ProductRailSection
        kind="best-sellers"
        scope={{ categoryId, gender }}
        hideWhenEmpty
        eyebrow="Most popular"
        title={label ? `${label} best sellers` : 'Best sellers'}
        description="Styles customers buy most in this collection."
      />
    </div>
  );
}
