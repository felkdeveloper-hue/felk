import type { ReactNode } from 'react';
import { Grid2x2, LayoutList } from 'lucide-react';
import { CATALOG_SORT_OPTIONS } from '@/constants/catalog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CatalogSearchState } from '@/utils/catalog';

export interface CatalogToolbarProps {
  state: CatalogSearchState;
  total?: number;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onViewChange: (view: 'grid' | 'list') => void;
  filterTrigger?: ReactNode;
  className?: string;
}

export function CatalogToolbar({
  state,
  total,
  onSortChange,
  onViewChange,
  filterTrigger,
  className,
}: CatalogToolbarProps) {
  const currentSort =
    CATALOG_SORT_OPTIONS.find(
      (option) => option.sortBy === state.sortBy && option.sortOrder === state.sortOrder,
    )?.value ?? 'createdAt:desc';

  return (
    <div
      className={cn(
        'border-border flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {filterTrigger}
        <p className="text-muted-foreground text-sm">
          {total != null ? `${total} products` : 'Loading products…'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={currentSort}
          onValueChange={(value) => {
            const option = CATALOG_SORT_OPTIONS.find((item) => item.value === value);
            if (option) onSortChange(option.sortBy, option.sortOrder);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Sort products">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {CATALOG_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          className="border-border inline-flex rounded-md border p-1"
          role="group"
          aria-label="View mode"
        >
          <Button
            type="button"
            size="icon"
            variant={state.view === 'grid' ? 'secondary' : 'ghost'}
            aria-label="Grid view"
            aria-pressed={state.view === 'grid'}
            onClick={() => onViewChange('grid')}
          >
            <Grid2x2 />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={state.view === 'list' ? 'secondary' : 'ghost'}
            aria-label="List view"
            aria-pressed={state.view === 'list'}
            onClick={() => onViewChange('list')}
          >
            <LayoutList />
          </Button>
        </div>
      </div>
    </div>
  );
}
