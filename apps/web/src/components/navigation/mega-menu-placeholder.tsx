import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import bagsImage from '@/assets/images/Categories/Bags.png';
import corsetImage from '@/assets/images/Categories/Corset.png';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import jeansImage from '@/assets/images/Categories/Jeans.png';
import newArrivalImage from '@/assets/images/Categories/New Arrival.png';
import oversizedImage from '@/assets/images/Categories/Oversized.png';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import jacketImage from '@/assets/images/Categories/WomenJacket.png';
import { ROUTES } from '@/constants';
import { useCategoriesList } from '@/hooks/catalog/use-categories';
import { cn } from '@/lib/utils';
import type { Category } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Image } from '@/components/media/image';

const FALLBACK_TILES = [
  { slug: 'new-arrivals', name: 'New Arrival', image: newArrivalImage },
  { slug: 'jeans', name: 'Jeans', image: jeansImage },
  { slug: 'oversized', name: 'Oversized', image: oversizedImage },
  { slug: 'corset', name: 'Corset', image: corsetImage },
  { slug: 'hoodies', name: 'Hoodies', image: hoodieImage },
  { slug: 'jackets', name: 'Jackets', image: jacketImage },
  { slug: 'bags', name: 'Bags', image: bagsImage },
  { slug: 'shoes', name: 'Shoes', image: shoesImage },
] as const;

const FALLBACK_BY_SLUG = new Map<string, (typeof FALLBACK_TILES)[number]>(
  FALLBACK_TILES.map((tile) => [tile.slug, tile]),
);

type MegaMenuCategory = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
};

function resolveMegaMenuCategories(apiCategories: Category[] | undefined): MegaMenuCategory[] {
  const active = (apiCategories ?? []).filter((category) => category.status !== 'archived');

  if (active.length > 0) {
    return active
      .map((category) => {
        const fallback = FALLBACK_BY_SLUG.get(category.slug);
        return {
          id: category.id,
          slug: category.slug,
          name: category.name,
          imageUrl: category.imageUrl || fallback?.image || '',
        };
      })
      .filter((tile) => Boolean(tile.imageUrl));
  }

  return FALLBACK_TILES.map((tile) => ({
    id: tile.slug,
    slug: tile.slug,
    name: tile.name,
    imageUrl: tile.image,
  }));
}

export interface MegaMenuPlaceholderProps {
  transparent?: boolean;
}

/** Desktop mega menu — all catalog categories with images. */
export function MegaMenuPlaceholder({ transparent }: MegaMenuPlaceholderProps) {
  const categoriesQuery = useCategoriesList();
  const categories = useMemo(
    () => resolveMegaMenuCategories(categoriesQuery.data?.data),
    [categoriesQuery.data?.data],
  );

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
        className="border-border/70 w-[min(96vw,58rem)] overflow-hidden rounded-3xl p-0 shadow-[var(--shadow-elevated)]"
      >
        <div className="grid sm:grid-cols-[1.55fr_1fr]">
          <div className="p-5 sm:p-6">
            <p className="text-muted-foreground mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]">
              All categories
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  asChild
                  className="h-auto cursor-pointer rounded-2xl p-0 focus:bg-transparent"
                >
                  <Link
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    preload="intent"
                    className="group block"
                  >
                    <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-2xl">
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        containerClassName="size-full rounded-none"
                      />
                      <div className="bg-linear-to-t absolute inset-0 from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-2 pb-2.5 pt-6 sm:pb-3">
                        <span className="block text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:text-[11px]">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <DropdownMenuItem asChild className="h-auto cursor-pointer p-0 focus:bg-transparent">
                <Link
                  to={ROUTES.categories}
                  preload="intent"
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
                >
                  View all
                </Link>
              </DropdownMenuItem>
            </div>
          </div>

          <Link
            to={ROUTES.products}
            className="bg-foreground relative hidden min-h-56 overflow-hidden text-white sm:block"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%),linear-gradient(160deg,#111_0%,#2a2a2a_100%)]" />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6">
              <div
                aria-hidden
                className="flex aspect-[4/3] w-full max-w-[11rem] items-center justify-center border border-[#c4a574]/70"
              >
                <span className="font-display text-5xl font-bold uppercase tracking-[-0.06em] text-white">
                  FE
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  New season
                </p>
                <p className="font-display mt-2 text-3xl font-bold uppercase tracking-tight">
                  Shop the edit
                </p>
              </div>
            </div>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
