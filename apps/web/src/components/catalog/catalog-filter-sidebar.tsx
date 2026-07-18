import { useMemo } from 'react';
import { Filters, type FilterGroup } from '@/components/ui/filters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import type { CatalogSearchState } from '@/utils/catalog';

export interface CatalogFilterSidebarProps {
  state: CatalogSearchState;
  onChange: (patch: Partial<CatalogSearchState>) => void;
  onClear: () => void;
  variant?: 'inline' | 'sheet';
  /** Hide the built-in Filters heading when the parent provides its own. */
  hideHeading?: boolean;
}

export function CatalogFilterSidebar({
  state,
  onChange,
  onClear,
  variant = 'inline',
  hideHeading = false,
}: CatalogFilterSidebarProps) {
  const facets = useCatalogFilterFacets();

  const groups = useMemo<FilterGroup[]>(() => {
    const build = (
      id: keyof CatalogSearchState,
      label: string,
      options: { id: string; label: string }[],
    ) => ({
      id,
      label,
      options,
    });

    return [
      build(
        'categoryId',
        'Category',
        facets.categories.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'brandId',
        'Brand',
        facets.brands.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'collectionId',
        'Collection',
        facets.collections.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'colorId',
        'Color',
        facets.colors.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'sizeId',
        'Size',
        facets.sizes.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'materialId',
        'Material',
        facets.materials.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build(
        'occasionId',
        'Occasion',
        facets.occasions.data?.data.map((item) => ({ id: item.id, label: item.name })) ?? [],
      ),
      build('inStock', 'Availability', [
        { id: 'true', label: 'In stock' },
        { id: 'false', label: 'Include sold out' },
      ]),
      build('onSale', 'Discount', [{ id: 'true', label: 'On sale' }]),
      build('rating', 'Rating', [
        { id: '4', label: '4★ & up (placeholder)' },
        { id: '3', label: '3★ & up (placeholder)' },
      ]),
    ].filter((group) => group.options.length > 0);
  }, [facets]);

  const values = {
    categoryId: state.categoryId ?? '',
    brandId: state.brandId ?? '',
    collectionId: state.collectionId ?? '',
    colorId: state.colorId ?? '',
    sizeId: state.sizeId ?? '',
    materialId: state.materialId ?? '',
    occasionId: state.occasionId ?? '',
    inStock: state.inStock === true ? 'true' : state.inStock === false ? 'false' : '',
    onSale: state.onSale ? 'true' : '',
    rating: state.rating ?? '',
  };

  return (
    <div className="space-y-6">
      <Filters
        variant={variant}
        groups={groups}
        values={values}
        onClear={onClear}
        hideHeading={hideHeading}
        onChange={(groupId, value) => {
          const key = groupId as keyof CatalogSearchState;
          if (key === 'inStock') {
            onChange({ inStock: value === 'true' ? true : value === 'false' ? false : undefined });
            return;
          }
          if (key === 'onSale') {
            onChange({ onSale: value === 'true' ? true : undefined });
            return;
          }
          onChange({ [key]: value || undefined });
        }}
      />

      <div className="space-y-3">
        <Label htmlFor="min-price">Price range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id="min-price"
            type="number"
            min={0}
            placeholder="Min"
            value={state.minPrice ?? ''}
            onChange={(event) =>
              onChange({ minPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
          <Input
            id="max-price"
            type="number"
            min={0}
            placeholder="Max"
            value={state.maxPrice ?? ''}
            onChange={(event) =>
              onChange({ maxPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function CatalogFilterSheet(props: CatalogFilterSidebarProps) {
  return <CatalogFilterSidebar {...props} variant="sheet" />;
}
