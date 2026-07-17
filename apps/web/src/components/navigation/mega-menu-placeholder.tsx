import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PLACEHOLDER_COLUMNS = [
  {
    title: 'Women',
    links: ['New Arrivals', 'Dresses', 'Outerwear', 'Accessories'],
  },
  {
    title: 'Men',
    links: ['New Arrivals', 'Tailoring', 'Knitwear', 'Footwear'],
  },
  {
    title: 'Collections',
    links: ['Essentials', 'Occasion', 'Resort', 'Limited Edition'],
  },
];

export interface MegaMenuPlaceholderProps {
  transparent?: boolean;
}

/** Desktop mega menu placeholder — wired to categories route until catalog navigation ships. */
export function MegaMenuPlaceholder({ transparent }: MegaMenuPlaceholderProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'hidden gap-1 text-sm font-semibold tracking-wide lg:inline-flex',
            transparent
              ? 'text-white hover:bg-white/10 hover:text-white'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Browse
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-border/70 w-[min(94vw,52rem)] overflow-hidden rounded-3xl p-0 shadow-[var(--shadow-elevated)]"
      >
        <div className="grid sm:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-6 p-6 sm:grid-cols-3">
            {PLACEHOLDER_COLUMNS.map((column) => (
              <div key={column.title}>
                <DropdownMenuLabel className="px-0 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {column.title}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2" />
                {column.links.map((link) => (
                  <DropdownMenuItem key={link} asChild className="cursor-pointer rounded-xl">
                    <Link to={ROUTES.categories}>{link}</Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </div>
          <Link
            to={ROUTES.products}
            className="bg-foreground relative hidden min-h-56 overflow-hidden text-white sm:block"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%),linear-gradient(160deg,#111_0%,#2a2a2a_100%)]" />
            <div className="relative flex h-full flex-col justify-end p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                New season
              </p>
              <p className="font-display mt-2 text-3xl font-bold uppercase tracking-tight">
                Shop the edit
              </p>
            </div>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
