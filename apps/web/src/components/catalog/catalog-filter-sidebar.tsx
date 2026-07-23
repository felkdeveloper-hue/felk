import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PriceRangeSlider } from '@/components/ui/price-range-slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useCatalogFilterFacets } from '@/hooks/catalog';
import { cn } from '@/lib/utils';
import type { CatalogSearchState } from '@/utils/catalog';
import { CATALOG_SORT_OPTIONS } from '@/constants/catalog';

export interface CatalogFilterSidebarProps {
  state: CatalogSearchState;
  onChange: (patch: Partial<CatalogSearchState>) => void;
  onClear: () => void;
  variant?: 'inline' | 'sheet';
  layout?: 'stack' | 'top';
  hideHeading?: boolean;
  priceBounds?: { min: number; max: number };
}

const DISCOUNT_OPTIONS = [
  { id: '0-20', label: '0–20% OFF' },
  { id: '21-30', label: '21–30% OFF' },
  { id: '31-40', label: '31–40% OFF' },
  { id: '41-60', label: '41–60% OFF' },
] as const;

/* ------------------------------------------------------------------ */
/* Shared option row                                                    */
/* ------------------------------------------------------------------ */
function OptionRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="hover:text-foreground flex cursor-pointer items-center gap-3 py-2.5 text-sm transition-colors"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="rounded-none"
      />
      <span className={cn('text-foreground/80', checked && 'text-foreground font-medium')}>
        {label}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Inline sidebar (used on older pages / search page)                   */
/* ------------------------------------------------------------------ */
function InlineFilters({
  state,
  onChange,
  onClear,
  priceBounds,
}: Omit<CatalogFilterSidebarProps, 'variant' | 'layout' | 'hideHeading'>) {
  const facets = useCatalogFilterFacets();
  const bounds = priceBounds ?? { min: 0, max: 50_000 };
  const categories = useMemo(
    () =>
      (facets.categories.data?.data ?? []).filter((c) => c.slug !== 'men' && c.slug !== 'women'),
    [facets.categories.data?.data],
  );
  const brands = facets.brands.data?.data ?? [];
  const colors = facets.colors.data?.data ?? [];
  const materials = facets.materials.data?.data ?? [];
  const sizes = facets.sizes.data?.data ?? [];

  return (
    <div className="space-y-5">
      {categories.length ? (
        <section className="border-border/60 border-b pb-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Category</h3>
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
            {categories.map((c) => (
              <OptionRow
                key={c.id}
                id={`category-${c.id}`}
                label={c.name}
                checked={state.categoryId === c.id}
                onCheckedChange={(checked) =>
                  onChange({ categoryId: checked ? c.id : undefined, page: 1 })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-border/60 border-b pb-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Price</h3>
        <PriceRangeSlider
          min={bounds.min}
          max={bounds.max}
          valueMin={state.minPrice}
          valueMax={state.maxPrice}
          onChange={(min, max) => onChange({ minPrice: min, maxPrice: max, page: 1 })}
        />
      </section>

      {sizes.length ? (
        <section className="border-border/60 border-b pb-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Size</h3>
          <div className="space-y-0.5">
            {sizes.map((s) => (
              <OptionRow
                key={s.id}
                id={`size-${s.id}`}
                label={s.name}
                checked={state.sizeId === s.id}
                onCheckedChange={(checked) =>
                  onChange({ sizeId: checked ? s.id : undefined, page: 1 })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {colors.length ? (
        <section className="border-border/60 border-b pb-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Color</h3>
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
            {colors.map((c) => (
              <OptionRow
                key={c.id}
                id={`color-${c.id}`}
                label={c.name}
                checked={state.colorId === c.id}
                onCheckedChange={(checked) =>
                  onChange({ colorId: checked ? c.id : undefined, page: 1 })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {brands.length ? (
        <section className="border-border/60 border-b pb-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Brand</h3>
          <div className="space-y-0.5">
            {brands.map((b) => (
              <OptionRow
                key={b.id}
                id={`brand-${b.id}`}
                label={b.name}
                checked={state.brandId === b.id}
                onCheckedChange={(checked) =>
                  onChange({ brandId: checked ? b.id : undefined, page: 1 })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {materials.length ? (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Material</h3>
          <div className="space-y-0.5">
            {materials.map((m) => (
              <OptionRow
                key={m.id}
                id={`material-${m.id}`}
                label={m.name}
                checked={state.materialId === m.id}
                onCheckedChange={(checked) =>
                  onChange({ materialId: checked ? m.id : undefined, page: 1 })
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function CatalogFilterSidebar(props: CatalogFilterSidebarProps) {
  return (
    <aside aria-label="Refine By">
      <InlineFilters
        state={props.state}
        onChange={props.onChange}
        onClear={props.onClear}
        priceBounds={props.priceBounds}
      />
    </aside>
  );
}

export function CatalogFilterSheet(props: CatalogFilterSidebarProps) {
  return <CatalogFilterSidebar {...props} />;
}

/* ------------------------------------------------------------------ */
/* Combined Filter + Sort — Bonkers Corner two-column design           */
/* ------------------------------------------------------------------ */
export interface CatalogFilterAndSortSheetProps extends CatalogFilterSidebarProps {
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  total?: number;
}

type SectionKey =
  'availability' | 'price' | 'size' | 'category' | 'color' | 'brand' | 'material' | 'discount';

export function CatalogFilterAndSortSheet({
  state,
  onChange,
  onClear,
  onSortChange,
  total,
  priceBounds,
}: CatalogFilterAndSortSheetProps) {
  const facets = useCatalogFilterFacets();
  const bounds = priceBounds ?? { min: 0, max: 50_000 };

  const categories = useMemo(
    () =>
      (facets.categories.data?.data ?? []).filter((c) => c.slug !== 'men' && c.slug !== 'women'),
    [facets.categories.data?.data],
  );
  const colors = facets.colors.data?.data ?? [];
  const materials = facets.materials.data?.data ?? [];
  const sizes = facets.sizes.data?.data ?? [];

  const sections: { key: SectionKey; label: string; hide?: boolean }[] = [
    { key: 'availability', label: 'Availability' },
    { key: 'price', label: 'Price' },
    { key: 'size', label: 'Size', hide: !sizes.length },
    { key: 'category', label: 'Category', hide: !categories.length },
    { key: 'color', label: 'Color', hide: !colors.length },
    { key: 'material', label: 'Fabric', hide: !materials.length },
    { key: 'discount', label: 'Discount' },
  ].filter((s) => !s.hide);

  const [activeSection, setActiveSection] = useState<SectionKey>(
    sections[0]?.key ?? 'availability',
  );

  const activeCount = [
    state.categoryId,
    state.colorId,
    state.materialId,
    state.sizeId,
    state.minPrice != null || state.maxPrice != null ? true : undefined,
    state.discountBand,
    state.inStock,
    state.onSale,
  ].filter(Boolean).length;

  const currentSort =
    CATALOG_SORT_OPTIONS.find((o) => o.sortBy === state.sortBy && o.sortOrder === state.sortOrder)
      ?.value ?? 'createdAt:desc';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="border-foreground hover:bg-foreground hover:text-background inline-flex h-10 items-center gap-2.5 border px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors"
        >
          <SlidersHorizontal className="size-3.5" />
          Filter and Sort
          {activeCount > 0 ? (
            <span className="size-4.5 bg-foreground text-background ml-0.5 flex items-center justify-center rounded-full text-[10px] font-bold">
              {activeCount}
            </span>
          ) : null}
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showClose={false}
        className="max-w-130 lg:top-19 top-16 flex h-[calc(100%-4rem)] w-full flex-col gap-0 rounded-none p-0 lg:h-[calc(100%-4.75rem)]"
      >
        {/* ── Header ── */}
        <SheetHeader className="border-border flex-row items-baseline gap-3 border-b px-6 py-4">
          <SheetTitle className="text-xs font-bold uppercase tracking-[0.16em]">
            Filter and Sort
          </SheetTitle>
          {total != null ? (
            <span className="text-muted-foreground text-xs">{total} products</span>
          ) : null}
          <SheetDescription className="sr-only">Filter and sort products</SheetDescription>
        </SheetHeader>

        {/* ── Two-column body ── */}
        <div className="flex min-h-0 flex-1">
          {/* Left nav */}
          <nav className="border-border w-36 shrink-0 border-r">
            <ul className="py-2">
              {sections.map((s) => {
                const isActive = activeSection === s.key;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(s.key)}
                      className={cn(
                        'w-full px-5 py-3.5 text-left text-xs font-bold uppercase tracking-[0.12em] transition-colors',
                        isActive
                          ? 'border-foreground text-foreground border-l-2'
                          : 'text-muted-foreground hover:text-foreground border-l-2 border-transparent',
                      )}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right options — changes apply immediately */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeSection === 'availability' && (
              <div className="space-y-1">
                <OptionRow
                  id="instock"
                  label="In stock"
                  checked={state.inStock === true}
                  onCheckedChange={(checked) =>
                    onChange({ inStock: checked ? true : undefined, page: 1 })
                  }
                />
                <OptionRow
                  id="onsale"
                  label="On sale"
                  checked={state.onSale === true}
                  onCheckedChange={(checked) =>
                    onChange({ onSale: checked ? true : undefined, page: 1 })
                  }
                />
              </div>
            )}

            {activeSection === 'price' && (
              <div className="pt-2">
                <PriceRangeSlider
                  min={bounds.min}
                  max={bounds.max}
                  valueMin={state.minPrice}
                  valueMax={state.maxPrice}
                  onChange={(min, max) => onChange({ minPrice: min, maxPrice: max, page: 1 })}
                />
              </div>
            )}

            {activeSection === 'size' && (
              <div className="space-y-1">
                {sizes.map((s) => (
                  <OptionRow
                    key={s.id}
                    id={`size-${s.id}`}
                    label={s.name}
                    checked={state.sizeId === s.id}
                    onCheckedChange={(checked) =>
                      onChange({ sizeId: checked ? s.id : undefined, page: 1 })
                    }
                  />
                ))}
              </div>
            )}

            {activeSection === 'category' && (
              <div className="space-y-1">
                {categories.map((c) => (
                  <OptionRow
                    key={c.id}
                    id={`category-${c.id}`}
                    label={c.name}
                    checked={state.categoryId === c.id}
                    onCheckedChange={(checked) =>
                      onChange({ categoryId: checked ? c.id : undefined, page: 1 })
                    }
                  />
                ))}
              </div>
            )}

            {activeSection === 'color' && (
              <div className="space-y-1">
                {colors.map((c) => (
                  <OptionRow
                    key={c.id}
                    id={`color-${c.id}`}
                    label={c.name}
                    checked={state.colorId === c.id}
                    onCheckedChange={(checked) =>
                      onChange({ colorId: checked ? c.id : undefined, page: 1 })
                    }
                  />
                ))}
              </div>
            )}

            {activeSection === 'material' && (
              <div className="space-y-1">
                {materials.map((m) => (
                  <OptionRow
                    key={m.id}
                    id={`material-${m.id}`}
                    label={m.name}
                    checked={state.materialId === m.id}
                    onCheckedChange={(checked) =>
                      onChange({ materialId: checked ? m.id : undefined, page: 1 })
                    }
                  />
                ))}
              </div>
            )}

            {activeSection === 'discount' && (
              <div className="space-y-1">
                {DISCOUNT_OPTIONS.map((d) => (
                  <OptionRow
                    key={d.id}
                    id={`discount-${d.id}`}
                    label={d.label}
                    checked={state.discountBand === d.id}
                    onCheckedChange={(checked) =>
                      onChange({
                        discountBand: checked ? d.id : undefined,
                        onSale: checked ? true : undefined,
                        page: 1,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: Sort + Clear + Close ── */}
        <div className="border-border border-t px-6 py-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em]">Sort by</span>
            <Select
              value={currentSort}
              onValueChange={(value) => {
                const option = CATALOG_SORT_OPTIONS.find((o) => o.value === value);
                if (option) {
                  onChange({ sortBy: option.sortBy, sortOrder: option.sortOrder, page: 1 });
                  onSortChange?.(option.sortBy, option.sortOrder);
                }
              }}
            >
              <SelectTrigger className="h-8 w-44 rounded-none text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {CATALOG_SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClear}
              className="border-border hover:border-foreground h-11 flex-1 border text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Clear{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <SheetClose asChild>
              <button
                type="button"
                className="bg-foreground text-background h-11 flex-1 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-85"
              >
                Done
              </button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* Keep legacy RefineFiltersBody export used nowhere but avoids breaking imports */
export { InlineFilters as RefineFiltersBody };
