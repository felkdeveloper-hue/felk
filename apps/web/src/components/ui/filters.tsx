import { SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  /** When true, multiple options can be active at once. */
  multiple?: boolean;
}

export interface FiltersProps {
  groups: FilterGroup[];
  values: Record<string, string | string[]>;
  onChange: (groupId: string, value: string | string[]) => void;
  onClear?: () => void;
  className?: string;
  /** Desktop inline panel vs mobile sheet trigger. */
  variant?: 'inline' | 'sheet';
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background hover:bg-muted',
      )}
    >
      {label}
      {count !== undefined ? (
        <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
          {count}
        </Badge>
      ) : null}
    </button>
  );
}

function FilterGroups({
  groups,
  values,
  onChange,
}: Pick<FiltersProps, 'groups' | 'values' | 'onChange'>) {
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const current = values[group.id];
        const selected = Array.isArray(current) ? current : current ? [current] : [];

        return (
          <fieldset key={group.id} className="space-y-3">
            <legend className="text-foreground text-sm font-medium">{group.label}</legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const active = selected.includes(option.id);
                return (
                  <FilterChip
                    key={option.id}
                    active={active}
                    label={option.label}
                    count={option.count}
                    onClick={() => {
                      if (group.multiple) {
                        const next = active
                          ? selected.filter((id) => id !== option.id)
                          : [...selected, option.id];
                        onChange(group.id, next);
                      } else {
                        onChange(group.id, active ? '' : option.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/** Reusable filter panel for catalog/search pages (structure only — no data fetching). */
export function Filters({
  groups,
  values,
  onChange,
  onClear,
  className,
  variant = 'inline',
}: FiltersProps) {
  const activeCount = Object.values(values).reduce((sum, v) => {
    if (Array.isArray(v)) return sum + v.length;
    return sum + (v ? 1 : 0);
  }, 0);

  if (variant === 'sheet') {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
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
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine results — wiring happens in feature pages.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto pb-8">
            <FilterGroups groups={groups} values={values} onChange={onChange} />
            {onClear && activeCount > 0 ? (
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
    <aside className={cn('space-y-4', className)} aria-label="Filters">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
          Filters
        </h2>
        {onClear && activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      <FilterGroups groups={groups} values={values} onChange={onChange} />
    </aside>
  );
}
