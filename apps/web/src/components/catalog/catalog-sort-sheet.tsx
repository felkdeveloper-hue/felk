import { ArrowDownWideNarrow, X } from 'lucide-react';
import { CATALOG_PLP_SORT_OPTIONS } from '@/constants/catalog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { CatalogSearchState } from '@/utils/catalog';

export interface CatalogSortSheetProps {
  state: Pick<CatalogSearchState, 'sortBy' | 'sortOrder'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  /** When false, only the sheet is rendered (parent owns the trigger). Default true. */
  showTrigger?: boolean;
}

export function CatalogSortSheet({
  state,
  open,
  onOpenChange,
  onSortChange,
  showTrigger = true,
}: CatalogSortSheetProps) {
  const currentValue =
    CATALOG_PLP_SORT_OPTIONS.find(
      (option) => option.sortBy === state.sortBy && option.sortOrder === state.sortOrder,
    )?.value ?? 'createdAt:desc';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Sort products"
            className="border-border text-foreground hover:bg-muted/60 flex size-10 shrink-0 items-center justify-center border transition-colors active:scale-[0.97]"
          >
            <ArrowDownWideNarrow className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </SheetTrigger>
      ) : null}

      <SheetContent
        side="bottom"
        showClose={false}
        overlayClassName="z-[100] bg-foreground/45"
        className={cn(
          'z-[100] flex w-full flex-col gap-0 rounded-t-2xl border-t p-0',
          'h-auto max-h-[min(78dvh,560px)] !max-w-none pb-[env(safe-area-inset-bottom)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
        )}
      >
        <SheetHeader className="border-border/70 flex-row items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <SheetTitle className="font-display text-foreground text-[15px] font-semibold tracking-tight">
              Sort by
            </SheetTitle>
            <SheetDescription className="text-muted-foreground mt-0.5 text-[11px] tracking-wide">
              Choose how products are ordered
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/70 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </SheetClose>
        </SheetHeader>

        <ul
          className="min-h-0 flex-1 overflow-y-auto px-2 py-1"
          role="listbox"
          aria-label="Sort options"
        >
          {CATALOG_PLP_SORT_OPTIONS.map((option, index) => {
            const selected = option.value === currentValue;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSortChange(option.sortBy, option.sortOrder);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors',
                    'hover:bg-muted/50 active:bg-muted/70',
                    index > 0 && 'border-border/50 border-t',
                    selected && 'bg-muted/35',
                  )}
                >
                  <span
                    className={cn(
                      'text-[13px] tracking-[-0.01em]',
                      selected ? 'text-foreground font-semibold' : 'text-foreground/80 font-medium',
                    )}
                  >
                    {option.label}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
                      selected
                        ? 'border-foreground bg-foreground'
                        : 'border-foreground/35 group-hover:border-foreground/55',
                    )}
                  >
                    {selected ? <span className="bg-background size-[6px] rounded-full" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-border/70 border-t px-5 py-4">
          <SheetClose asChild>
            <button
              type="button"
              className="border-border text-foreground hover:border-foreground h-11 w-full border text-[11px] font-bold uppercase tracking-[0.16em] transition-colors active:opacity-80"
            >
              Close
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
