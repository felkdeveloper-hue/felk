import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import bagsImage from '@/assets/images/Categories/Bags.png';
import corsetImage from '@/assets/images/Categories/Corset.png';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import jeansImage from '@/assets/images/Categories/Jeans.png';
import newArrivalImage from '@/assets/images/Categories/New Arrival.png';
import oversizedImage from '@/assets/images/Categories/Oversized.png';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import jacketImage from '@/assets/images/Categories/WomenJacket.png';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';

export type MegaMenuGender = 'women' | 'men';

type MegaMenuLink = {
  label: string;
  slug: string;
};

type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

type MegaMenuSpecial = {
  label: string;
  slug: string;
  image: string;
};

type GenderMegaMenuConfig = {
  href: string;
  label: string;
  columns: MegaMenuColumn[];
  specials: MegaMenuSpecial[];
};

const SHARED_TOPWEAR: MegaMenuLink[] = [
  { label: 'Oversized', slug: 'oversized' },
  { label: 'New Arrivals', slug: 'new-arrivals' },
];

const SHARED_BOTTOMWEAR: MegaMenuLink[] = [{ label: 'Jeans', slug: 'jeans' }];

const SHARED_WINTERWEAR: MegaMenuLink[] = [
  { label: 'Hoodies', slug: 'hoodies' },
  { label: 'Jackets', slug: 'jackets' },
];

const SHARED_SPECIALS: MegaMenuSpecial[] = [
  { label: 'New Arrival', slug: 'new-arrivals', image: newArrivalImage },
  { label: 'Oversized', slug: 'oversized', image: oversizedImage },
  { label: 'Jeans', slug: 'jeans', image: jeansImage },
  { label: 'Hoodies', slug: 'hoodies', image: hoodieImage },
  { label: 'Shoes', slug: 'shoes', image: shoesImage },
  { label: 'Bags', slug: 'bags', image: bagsImage },
];

const MEGA_MENUS: Record<MegaMenuGender, GenderMegaMenuConfig> = {
  women: {
    href: '/categories/women',
    label: 'Women',
    columns: [
      {
        title: 'Topwear',
        links: [
          { label: 'All Topwear', slug: 'women' },
          ...SHARED_TOPWEAR,
          { label: 'Corset', slug: 'corset' },
        ],
      },
      {
        title: 'Bottomwear',
        links: [{ label: 'All Bottomwear', slug: 'women' }, ...SHARED_BOTTOMWEAR],
      },
      {
        title: 'Winterwear',
        links: [{ label: 'All Winterwear', slug: 'women' }, ...SHARED_WINTERWEAR],
      },
    ],
    specials: [
      ...SHARED_SPECIALS.slice(0, 4),
      { label: 'Corset', slug: 'corset', image: corsetImage },
      { label: 'Jackets', slug: 'jackets', image: jacketImage },
    ],
  },
  men: {
    href: '/categories/men',
    label: 'Men',
    columns: [
      {
        title: 'Topwear',
        links: [{ label: 'All Topwear', slug: 'men' }, ...SHARED_TOPWEAR],
      },
      {
        title: 'Bottomwear',
        links: [{ label: 'All Bottomwear', slug: 'men' }, ...SHARED_BOTTOMWEAR],
      },
      {
        title: 'Winterwear',
        links: [{ label: 'All Winterwear', slug: 'men' }, ...SHARED_WINTERWEAR],
      },
    ],
    specials: SHARED_SPECIALS,
  },
};

const CLOSE_DELAY_MS = 160;

export interface GenderMegaMenuProps {
  gender: MegaMenuGender;
  transparent?: boolean;
  activeHref?: string;
}

/** Desktop hover mega menu for Women / Men — column lists + specials. */
export function GenderMegaMenu({ gender, transparent, activeHref }: GenderMegaMenuProps) {
  const config = MEGA_MENUS[gender];
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = activeHref === config.href;
  const showUnderline = open || isActive;

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
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <Link
        to={config.href}
        preload="intent"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'relative inline-flex pb-1 text-sm font-semibold tracking-wide transition-colors',
          transparent
            ? 'text-white/85 hover:text-white'
            : 'text-muted-foreground hover:text-foreground',
          showUnderline && (transparent ? 'text-white' : 'text-foreground'),
        )}
      >
        {config.label}
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 -bottom-0.5 h-[3px] origin-left bg-[#E8C547] transition-transform duration-200',
            showUnderline ? 'scale-x-100' : 'scale-x-0',
          )}
        />
      </Link>

      <div
        id={panelId}
        role="region"
        aria-label={`${config.label} categories`}
        aria-hidden={!open}
        className={cn(
          'border-border/70 bg-background absolute left-1/2 top-full z-50 mt-3 w-[min(94vw,52rem)] -translate-x-1/2 overflow-hidden rounded-2xl border shadow-[var(--shadow-elevated)]',
          open
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0',
          'transition-opacity duration-150',
        )}
      >
        {/* Bridge so the pointer can move from the link into the panel */}
        <div aria-hidden className="absolute inset-x-0 -top-3 h-3" />

        <div className="grid grid-cols-2 md:grid-cols-4">
          {config.columns.map((column) => (
            <div key={column.title} className="border-border/50 border-r px-5 py-5 last:border-r-0">
              <p className="text-foreground mb-3 text-sm font-bold">{column.title}</p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      to="/categories/$slug"
                      params={{ slug: link.slug }}
                      preload="intent"
                      className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="bg-muted/35 border-border/50 col-span-2 border-t px-5 py-5 md:col-span-1 md:border-l md:border-t-0">
            <p className="text-foreground mb-4 text-sm font-bold uppercase tracking-[0.12em]">
              Specials
            </p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 md:grid-cols-2">
              {config.specials.map((special) => (
                <Link
                  key={special.label}
                  to="/categories/$slug"
                  params={{ slug: special.slug }}
                  preload="intent"
                  className="group flex flex-col items-center gap-1.5 text-center"
                  onClick={() => setOpen(false)}
                >
                  <span className="bg-muted relative size-14 overflow-hidden rounded-full ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105 sm:size-16">
                    <Image
                      src={special.image}
                      alt=""
                      className="size-full object-cover"
                      containerClassName="size-full rounded-none"
                    />
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground max-w-[5.5rem] text-[11px] font-medium leading-tight transition-colors">
                    {special.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
