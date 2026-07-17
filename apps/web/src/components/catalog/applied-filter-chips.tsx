import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CatalogSearchState } from '@/utils/catalog';

export interface AppliedFilterChip {
  key: keyof CatalogSearchState;
  label: string;
  value?: string | boolean;
}

export interface AppliedFilterChipsProps {
  chips: AppliedFilterChip[];
  onRemove: (key: keyof CatalogSearchState) => void;
  onClearAll?: () => void;
}

export function AppliedFilterChips({ chips, onRemove, onClearAll }: AppliedFilterChipsProps) {
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
      {chips.map((chip) => (
        <Badge key={String(chip.key)} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            className="hover:bg-background/60 rounded-full p-0.5"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => onRemove(chip.key)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {onClearAll ? (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
}
