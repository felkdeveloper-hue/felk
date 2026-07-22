import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PriceRangeSlider } from '@/components/ui/price-range-slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import { cn } from '@/lib/utils';
import type { CatalogSearchState } from '@/utils/catalog';

export interface CatalogFilterSidebarProps {
  state: CatalogSearchState;
  onChange: (patch: Partial<CatalogSearchState>) => void;
  onClear: () => void;
  variant?: 'inline' | 'sheet';
  /** Vertical stack (default) or multi-column top bar. */
  layout?: 'stack' | 'top';
  /** Hide the built-in heading when the parent provides its own. */
  hideHeading?: boolean;
  priceBounds?: { min: number; max: number };
}

const DISCOUNT_OPTIONS = [
  { id: '0-20', label: '0–20% OFF', min: 0, max: 20 },
  { id: '21-30', label: '21–30% OFF', min: 21, max: 30 },
  { id: '31-40', label: '31–40% OFF', min: 31, max: 40 },
  { id: '41-60', label: '41–60% OFF', min: 41, max: 60 },
] as const;

function FilterSection({
  title,
  children,
  className,
  layout = 'stack',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  layout?: 'stack' | 'top';
}) {
  return (
    <section
      className={cn(
        'space-y-3',
        layout === 'stack' && 'border-border/70 border-b pb-5 last:border-b-0 last:pb-0',
        layout === 'top' && 'min-w-0',
        className,
      )}
    >
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function OptionRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm transition-colors"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span className="text-foreground/90">{label}</span>
    </label>
  );
}

function RefineFiltersBody({
  state,
  onChange,
  onClear,
  hideHeading,
  layout = 'stack',
  priceBounds,
}: Omit<CatalogFilterSidebarProps, 'variant'>) {
  const facets = useCatalogFilterFacets();
  const bounds = priceBounds ?? { min: 0, max: 50000 };

  const categories = useMemo(
    () =>
      (facets.categories.data?.data ?? []).filter(
        (category) => category.slug !== 'men' && category.slug !== 'women',
      ),
    [facets.categories.data?.data],
  );
  const brands = facets.brands.data?.data ?? [];
  const occasions = facets.occasions.data?.data ?? [];
  const colors = facets.colors.data?.data ?? [];
  const materials = facets.materials.data?.data ?? [];
  const sizes = facets.sizes.data?.data ?? [];

  const activeCount = useMemo(() => {
    let count = 0;
    if (state.gender) count += 1;
    if (state.categoryId) count += 1;
    if (state.brandId) count += 1;
    if (state.occasionId) count += 1;
    if (state.colorId) count += 1;
    if (state.materialId) count += 1;
    if (state.sizeId) count += 1;
    if (state.minPrice != null || state.maxPrice != null) count += 1;
    if (state.discountBand) count += 1;
    if (state.onSale) count += 1;
    return count;
  }, [state]);

  return (
    <div className="space-y-4">
      {!hideHeading ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-foreground text-base font-bold">Refine By</h2>
          {activeCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </div>
      ) : activeCount > 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          layout === 'top'
            ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'
            : 'space-y-1',
        )}
      >
        <FilterSection title="Gender" layout={layout}>
          <RadioGroup
            value={state.gender ?? 'all'}
            onValueChange={(value) =>
              onChange({ gender: value === 'all' ? undefined : value, page: 1 })
            }
            className="gap-2"
          >
            {[
              { value: 'all', label: 'All' },
              { value: 'women', label: 'Women' },
              { value: 'men', label: 'Men' },
            ].map((option) => (
              <label
                key={option.value}
                htmlFor={`gender-${option.value}`}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm"
              >
                <RadioGroupItem id={`gender-${option.value}`} value={option.value} />
                <span>{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </FilterSection>

        {categories.length ? (
          <FilterSection title="Category" layout={layout}>
            <div
              className={cn(
                'space-y-0.5 pr-1',
                layout === 'top' ? 'max-h-44 overflow-y-auto' : 'max-h-56 overflow-y-auto',
              )}
            >
              {categories.map((category) => (
                <OptionRow
                  key={category.id}
                  id={`category-${category.id}`}
                  label={category.name}
                  checked={state.categoryId === category.id}
                  onCheckedChange={(checked) =>
                    onChange({ categoryId: checked ? category.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Price" layout={layout}>
          <PriceRangeSlider
            min={bounds.min}
            max={bounds.max}
            valueMin={state.minPrice}
            valueMax={state.maxPrice}
            onChange={(minPrice, maxPrice) => onChange({ minPrice, maxPrice, page: 1 })}
          />
        </FilterSection>

        {brands.length ? (
          <FilterSection title="Brands" layout={layout}>
            <div className="space-y-0.5">
              {brands.map((brand) => (
                <OptionRow
                  key={brand.id}
                  id={`brand-${brand.id}`}
                  label={brand.name}
                  checked={state.brandId === brand.id}
                  onCheckedChange={(checked) =>
                    onChange({ brandId: checked ? brand.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {colors.length ? (
          <FilterSection title="Color" layout={layout}>
            <div
              className={cn(
                'space-y-0.5',
                layout === 'top'
                  ? 'max-h-44 overflow-y-auto pr-1'
                  : 'max-h-56 overflow-y-auto pr-1',
              )}
            >
              {colors.map((color) => (
                <OptionRow
                  key={color.id}
                  id={`color-${color.id}`}
                  label={color.name}
                  checked={state.colorId === color.id}
                  onCheckedChange={(checked) =>
                    onChange({ colorId: checked ? color.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {materials.length ? (
          <FilterSection title="Material" layout={layout}>
            <div
              className={cn(
                'space-y-0.5',
                layout === 'top'
                  ? 'max-h-44 overflow-y-auto pr-1'
                  : 'max-h-56 overflow-y-auto pr-1',
              )}
            >
              {materials.map((material) => (
                <OptionRow
                  key={material.id}
                  id={`material-${material.id}`}
                  label={material.name}
                  checked={state.materialId === material.id}
                  onCheckedChange={(checked) =>
                    onChange({ materialId: checked ? material.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {occasions.length ? (
          <FilterSection title="Occasion" layout={layout}>
            <div className="space-y-0.5">
              {occasions.map((occasion) => (
                <OptionRow
                  key={occasion.id}
                  id={`occasion-${occasion.id}`}
                  label={occasion.name}
                  checked={state.occasionId === occasion.id}
                  onCheckedChange={(checked) =>
                    onChange({ occasionId: checked ? occasion.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Discount" layout={layout}>
          <div className="space-y-0.5">
            {DISCOUNT_OPTIONS.map((option) => (
              <OptionRow
                key={option.id}
                id={`discount-${option.id}`}
                label={option.label}
                checked={state.discountBand === option.id}
                onCheckedChange={(checked) =>
                  onChange({
                    discountBand: checked ? option.id : undefined,
                    onSale: checked ? true : undefined,
                    page: 1,
                  })
                }
              />
            ))}
          </div>
        </FilterSection>

        {sizes.length ? (
          <FilterSection title="Size & Fit" layout={layout}>
            <div
              className={cn(
                'space-y-0.5',
                layout === 'top' ? 'max-h-44 overflow-y-auto pr-1' : undefined,
              )}
            >
              {sizes.map((size) => (
                <OptionRow
                  key={size.id}
                  id={`size-${size.id}`}
                  label={size.name}
                  checked={state.sizeId === size.id}
                  onCheckedChange={(checked) =>
                    onChange({ sizeId: checked ? size.id : undefined, page: 1 })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}
      </div>
    </div>
  );
}

export function CatalogFilterSidebar({
  state,
  onChange,
  onClear,
  variant = 'inline',
  layout = 'stack',
  hideHeading = false,
  priceBounds,
}: CatalogFilterSidebarProps) {
  if (variant === 'sheet') {
    const activeCount = [
      state.gender,
      state.categoryId,
      state.brandId,
      state.occasionId,
      state.colorId,
      state.materialId,
      state.sizeId,
      state.minPrice != null || state.maxPrice != null ? true : undefined,
      state.discountBand,
    ].filter(Boolean).length;

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <SlidersHorizontal />
            Filters
            {activeCount > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Refine By</SheetTitle>
            <SheetDescription>
              Filter products by gender, category, price, and more.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto pb-8">
            <RefineFiltersBody
              state={state}
              onChange={onChange}
              onClear={onClear}
              hideHeading
              priceBounds={priceBounds}
            />
            {activeCount > 0 ? (
              <Button variant="ghost" className="mt-6 w-full" onClick={onClear}>
                <X className="size-4" />
                Clear all
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside aria-label="Refine By">
      <RefineFiltersBody
        state={state}
        onChange={onChange}
        onClear={onClear}
        hideHeading={hideHeading}
        layout={layout}
        priceBounds={priceBounds}
      />
    </aside>
  );
}

export function CatalogFilterSheet(props: CatalogFilterSidebarProps) {
  return <CatalogFilterSidebar {...props} variant="sheet" />;
}
