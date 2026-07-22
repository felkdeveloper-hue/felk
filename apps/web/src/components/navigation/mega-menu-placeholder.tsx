import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { Image } from '@/components/media/image';

const CLOSE_DELAY_MS = 180;
const PANEL_HEIGHT = 'min(78dvh, calc(100dvh - 5.75rem))';

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

/** Desktop mega menu — all catalog categories with images (scrollable panel). */
export function MegaMenuPlaceholder({ transparent }: MegaMenuPlaceholderProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const categoriesQuery = useCategoriesList();
  const categories = useMemo(
    () => resolveMegaMenuCategories(categoriesQuery.data?.data),
    [categoriesQuery.data?.data],
  );

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const hide = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  // Ensure wheel scrolling works even if a parent tries to trap it.
  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      const atTop = scrollTop <= 0 && event.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && event.deltaY > 0;
      if (!atTop && !atBottom) {
        event.stopPropagation();
      }
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => node.removeEventListener('wheel', onWheel);
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden lg:block" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center gap-1 pb-1 text-sm font-semibold tracking-wide transition-colors',
          transparent
            ? 'text-white/85 hover:text-white'
            : 'text-muted-foreground hover:text-foreground',
          open && (transparent ? 'text-white' : 'text-foreground'),
        )}
      >
        Browse
        <ChevronDown
          className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-label="All categories"
        aria-hidden={!open}
        style={{ height: PANEL_HEIGHT }}
        className={cn(
          'border-border/70 bg-background absolute left-1/2 top-full z-[120] mt-3 w-[min(96vw,58rem)] -translate-x-1/2 border shadow-[var(--shadow-elevated)]',
          open
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0',
          'transition-opacity duration-150',
        )}
      >
        {/* Bridge so the pointer can move from the trigger into the panel */}
        <div aria-hidden className="absolute inset-x-0 -top-3 h-3" />

        <div className="grid h-full min-h-0 grid-rows-1 sm:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden p-5 sm:p-6">
            <p className="text-muted-foreground mb-4 shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em]">
              All categories
            </p>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-scroll overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
              <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    preload="intent"
                    className="group block"
                    onClick={() => setOpen(false)}
                  >
                    <div className="bg-muted relative aspect-[3/4] overflow-hidden">
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        containerClassName="size-full"
                      />
                      <div className="bg-linear-to-t absolute inset-0 from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-2 pb-2.5 pt-6 sm:pb-3">
                        <span className="block text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:text-[11px]">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-border/60 mt-4 flex shrink-0 justify-end border-t pt-3">
              <Link
                to={ROUTES.categories}
                preload="intent"
                className="text-muted-foreground hover:text-foreground text-xs font-semibold uppercase tracking-[0.14em] transition-colors"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>

          <Link
            to={ROUTES.products}
            className="bg-foreground relative hidden h-full min-h-0 overflow-hidden text-white sm:block"
            onClick={() => setOpen(false)}
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
      </div>
    </div>
  );
}
