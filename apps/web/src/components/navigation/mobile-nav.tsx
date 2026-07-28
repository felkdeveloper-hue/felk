import { useEffect, useMemo, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { ROUTES } from '@/constants';
import {
  DEFAULT_MEGA_MENUS,
  type MegaMenuColumn,
  type NavigationMenuKey,
} from '@/constants/mega-menu-defaults';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/components/navigation/main-nav';
import { resolveMegaMenuLink } from '@/utils/mega-menu-links';

export interface MobileNavProps {
  items: NavItem[];
  activeHref?: string;
  transparent?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type AccordionSection = {
  id: string;
  label: string;
  menuKey?: NavigationMenuKey;
  href?: string;
  gender?: 'women' | 'men';
  columns?: MegaMenuColumn[];
};

/** Only sections that exist on this storefront — no Men / Accessories / Sale. */
function buildSections(items: NavItem[]): AccordionSection[] {
  const women = DEFAULT_MEGA_MENUS.women;

  const sections: AccordionSection[] = [
    {
      id: 'women',
      label: 'Women',
      menuKey: 'women',
      gender: 'women',
      columns: women.columns,
    },
    { id: 'collections', label: 'Collections', href: ROUTES.categories },
  ];

  for (const item of items) {
    const label = item.label.trim().toLowerCase();
    if (
      item.gender === 'women' ||
      item.gender === 'men' ||
      label === 'browse' ||
      label === 'women' ||
      label === 'men' ||
      label === 'accessories' ||
      label === 'sale'
    ) {
      continue;
    }
    if (sections.some((s) => s.label.toLowerCase() === label)) continue;
    sections.push({
      id: label,
      label: item.label,
      href: item.href,
      gender: item.gender,
    });
  }

  return sections;
}

function MegaMenuItemLink({
  slug,
  menuKey,
  label,
  onNavigate,
}: {
  slug: string;
  menuKey: NavigationMenuKey;
  label: string;
  onNavigate: () => void;
}) {
  const target = resolveMegaMenuLink(slug, menuKey);
  const className =
    'text-foreground flex min-h-12 items-center text-[15px] font-medium tracking-wide transition-opacity duration-150 active:opacity-60';

  if (target.kind === 'category') {
    return (
      <Link
        to="/categories/$slug"
        params={{ slug: target.slug }}
        preload="intent"
        onClick={onNavigate}
        className={className}
      >
        {label}
      </Link>
    );
  }

  if (target.kind === 'products') {
    return (
      <Link
        to={ROUTES.products}
        search={target.search as never}
        preload="intent"
        onClick={onNavigate}
        className={className}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={target.to}
      search={target.search as never}
      preload="intent"
      onClick={onNavigate}
      className={className}
    >
      {label}
    </Link>
  );
}

function AccordionBlock({
  section,
  openId,
  onToggle,
  onNavigate,
  searchGender,
  activeHref,
}: {
  section: AccordionSection;
  openId: string | null;
  onToggle: (id: string) => void;
  onNavigate: () => void;
  searchGender?: string;
  activeHref?: string;
}) {
  const isOpen = openId === section.id;
  const hasChildren = Boolean(section.columns?.length);
  const isActive = section.gender
    ? activeHref === ROUTES.products && searchGender === section.gender
    : activeHref === section.href;

  const rowClass = cn(
    'font-display flex min-h-14 items-center border-b border-border/60 px-1 text-[1.35rem] font-semibold uppercase tracking-[-0.02em] transition-opacity duration-150',
    isActive ? 'text-foreground' : 'text-foreground/90',
  );

  if (!hasChildren) {
    if (section.gender) {
      return (
        <Link
          to={ROUTES.products}
          search={{ gender: section.gender }}
          preload="intent"
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={cn(rowClass, 'justify-between')}
        >
          {section.label}
          <ChevronRight className="text-foreground size-5 shrink-0 stroke-[1.5]" aria-hidden />
        </Link>
      );
    }

    return (
      <Link
        to={section.href ?? ROUTES.home}
        preload="intent"
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(rowClass, 'justify-between')}
      >
        {section.label}
        <ChevronRight className="text-foreground size-5 shrink-0 stroke-[1.5]" aria-hidden />
      </Link>
    );
  }

  return (
    <div className="border-border/60 border-b">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => onToggle(section.id)}
        className={cn(rowClass, 'w-full justify-between text-left active:opacity-70')}
      >
        {section.label}
        <ChevronDown
          className={cn(
            'text-foreground size-5 shrink-0 stroke-[1.5] transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-6 pb-6 pt-2">
            {section.gender ? (
              <Link
                to={ROUTES.products}
                search={{ gender: section.gender }}
                preload="intent"
                onClick={onNavigate}
                className="text-muted-foreground flex min-h-10 items-center text-[11px] font-bold uppercase tracking-[0.2em] transition-opacity duration-150 active:opacity-70"
              >
                Shop all {section.label}
              </Link>
            ) : null}

            {section.columns?.map((column) => (
              <div key={column.title} className="space-y-1">
                <p className="text-muted-foreground px-0 pb-1 text-[10px] font-bold uppercase tracking-[0.22em]">
                  {column.title}
                </p>
                <ul>
                  {column.links.map((link) => {
                    if (link.heading) {
                      return (
                        <li key={`${column.title}-${link.label}-h`}>
                          <p className="text-muted-foreground pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                            {link.label}
                          </p>
                        </li>
                      );
                    }
                    return (
                      <li key={`${column.title}-${link.slug}`}>
                        <MegaMenuItemLink
                          slug={link.slug}
                          menuKey={section.menuKey ?? 'women'}
                          label={link.label}
                          onNavigate={onNavigate}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium full-screen mobile navigation (Zara / COS style).
 * Desktop mega menu is never shown here — accordion categories only.
 */
export function MobileNav({ items, activeHref, transparent, open, onOpenChange }: MobileNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const searchGender = useRouterState({
    select: (state) => {
      const search = state.location.search as Record<string, unknown>;
      return typeof search.gender === 'string' ? search.gender : undefined;
    },
  });

  const sections = useMemo(() => buildSections(items), [items]);

  // Reset accordions closed whenever the menu is reopened.
  useEffect(() => {
    if (open) setOpenId(null);
  }, [open]);

  const close = () => onOpenChange?.(false);
  const hasContactInMain = sections.some((s) => s.label.toLowerCase() === 'contact');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className={cn(
            'size-11 shrink-0 lg:hidden',
            transparent ? 'text-primary-foreground hover:bg-primary-foreground/10' : undefined,
          )}
        >
          <Menu className="size-5" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showClose={false}
        className="bg-background z-[110] flex h-dvh w-full max-w-none flex-col gap-0 border-0 p-0 sm:max-w-none"
      >
        <SheetHeader className="border-border/50 flex flex-row items-center justify-between border-b px-5 py-3">
          <SheetTitle className="font-display text-lg font-bold uppercase tracking-[-0.03em]">
            Menu
          </SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            className="size-11"
            onClick={close}
          >
            <X className="size-5" strokeWidth={1.75} />
          </Button>
        </SheetHeader>

        <nav
          aria-label="Shop"
          className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-1"
        >
          {sections.map((section) => (
            <AccordionBlock
              key={section.id}
              section={section}
              openId={openId}
              onToggle={(id) => setOpenId((prev) => (prev === id ? null : id))}
              onNavigate={close}
              searchGender={searchGender}
              activeHref={activeHref}
            />
          ))}

          <div className="mt-6 space-y-0.5 pt-2">
            <Link
              to={ROUTES.account}
              onClick={close}
              className="text-muted-foreground active:text-foreground flex min-h-11 items-center text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Account
            </Link>
            <Link
              to={ROUTES.wishlist}
              onClick={close}
              className="text-muted-foreground active:text-foreground flex min-h-11 items-center text-sm font-medium tracking-wide transition-colors duration-150"
            >
              Wishlist
            </Link>
            {!hasContactInMain ? (
              <Link
                to={ROUTES.contact}
                onClick={close}
                className="text-muted-foreground active:text-foreground flex min-h-11 items-center text-sm font-medium tracking-wide transition-colors duration-150"
              >
                Contact
              </Link>
            ) : null}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
