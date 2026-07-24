import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/constants';
import {
  DEFAULT_MEGA_MENUS,
  type MegaMenuGender,
  type NavigationMenuKey,
} from '@/constants/mega-menu-defaults';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import { navigationMenusApi } from '@/services/sdk/navigation-menus';
import { resolveMegaMenuLink } from '@/utils/mega-menu-links';

export type { MegaMenuGender, NavigationMenuKey };

const CLOSE_DELAY_MS = 160;

function MegaMenuNavLink({
  route,
  menuKey,
  className,
  onNavigate,
  children,
}: {
  route: string;
  menuKey: NavigationMenuKey;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const target = resolveMegaMenuLink(route, menuKey);

  if (target.kind === 'category') {
    return (
      <Link
        to="/categories/$slug"
        params={{ slug: target.slug }}
        preload="intent"
        className={className}
        onClick={onNavigate}
      >
        {children}
      </Link>
    );
  }

  if (target.kind === 'products') {
    return (
      <Link
        to={ROUTES.products}
        search={target.search}
        preload="intent"
        className={className}
        onClick={onNavigate}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={target.to as '/'}
      search={target.search}
      preload="intent"
      className={className}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

export interface GenderMegaMenuProps {
  /** @deprecated Prefer menuKey */
  gender?: NavigationMenuKey;
  menuKey?: NavigationMenuKey;
  transparent?: boolean;
  activeHref?: string;
}

/** Desktop hover mega menu — CMS-driven with hardcoded fallback. */
export function GenderMegaMenu({
  gender,
  menuKey: menuKeyProp,
  transparent,
  activeHref,
}: GenderMegaMenuProps) {
  const menuKey = menuKeyProp ?? gender ?? 'women';
  const menuQuery = useQuery({
    queryKey: ['storefront', 'navigation-menus', menuKey],
    queryFn: () => navigationMenusApi.getByKey(menuKey),
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });
  const config = menuQuery.data ?? DEFAULT_MEGA_MENUS[menuKey];
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGender = useRouterState({
    select: (state) => {
      const search = state.location.search as Record<string, unknown>;
      return typeof search.gender === 'string' ? search.gender : undefined;
    },
  });
  const isActive =
    (menuKey === 'women' || menuKey === 'men') &&
    activeHref === ROUTES.products &&
    searchGender === menuKey;
  const isAccessoriesActive = menuKey === 'accessories' && activeHref === '/categories/accessories';
  const showUnderline = open || isActive || isAccessoriesActive;
  const triggerClassName = cn(
    'relative inline-flex pb-1 text-sm font-semibold tracking-wide transition-colors',
    transparent ? 'text-white/85 hover:text-white' : 'text-muted-foreground hover:text-foreground',
    showUnderline && (transparent ? 'text-white' : 'text-foreground'),
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
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const triggerLink =
    menuKey === 'accessories' ? (
      <Link
        to="/categories/$slug"
        params={{ slug: 'accessories' }}
        preload="intent"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        aria-current={isAccessoriesActive ? 'page' : undefined}
        className={triggerClassName}
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
    ) : (
      <Link
        to={ROUTES.products}
        search={{ gender: config.gender ?? menuKey }}
        preload="intent"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        aria-current={isActive ? 'page' : undefined}
        className={triggerClassName}
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
    );

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {triggerLink}

      <div
        id={panelId}
        role="region"
        aria-label={`${config.label} categories`}
        aria-hidden={!open}
        className={cn(
          'border-border/70 bg-background absolute left-1/2 top-full z-50 mt-3 w-[min(96vw,68rem)] -translate-x-1/2 overflow-hidden rounded-2xl border shadow-[var(--shadow-elevated)]',
          open
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0',
          'transition-opacity duration-150',
        )}
      >
        <div aria-hidden className="absolute inset-x-0 -top-3 h-3" />

        {/* Category columns + Specials in a flex row so Specials is ALWAYS the rightmost column */}
        <div className="divide-border/50 flex divide-x">
          {/* Category link columns — equal width, flexible */}
          <div className="flex min-w-0 flex-1">
            {config.columns.map((column, idx) => (
              <div
                key={column.title}
                className={cn(
                  'flex-1 px-5 py-5',
                  idx < config.columns.length - 1 && 'border-border/50 border-r',
                )}
              >
                <p className="text-foreground mb-3 text-sm font-bold">{column.title}</p>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <MegaMenuNavLink
                        route={link.slug}
                        menuKey={menuKey}
                        className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
                        onNavigate={() => setOpen(false)}
                      >
                        {link.label}
                      </MegaMenuNavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* SPECIALS — always pinned to the right */}
          <div className="bg-muted/35 w-52 shrink-0 px-5 py-5">
            <p className="text-foreground mb-4 text-sm font-bold uppercase tracking-[0.12em]">
              Specials
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {config.specials.map((special) => (
                <MegaMenuNavLink
                  key={special.label}
                  route={special.slug}
                  menuKey={menuKey}
                  className="group flex flex-col items-center gap-1.5 text-center"
                  onNavigate={() => setOpen(false)}
                >
                  <span className="bg-muted relative size-14 overflow-hidden rounded-full ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105 sm:size-16">
                    {special.imageUrl ? (
                      <Image
                        src={special.imageUrl}
                        alt=""
                        className="size-full object-cover object-[center_20%]"
                        containerClassName="size-full rounded-none"
                      />
                    ) : null}
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground max-w-[5.5rem] text-[11px] font-medium leading-tight transition-colors">
                    {special.label}
                  </span>
                </MegaMenuNavLink>
              ))}
            </div>
          </div>
        </div>

        {config.featured?.length ? (
          <div className="border-border/50 border-t px-4 py-4 sm:px-5">
            <p className="text-foreground mb-3 text-sm font-bold uppercase tracking-[0.12em]">
              Shop the edit
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {config.featured.map((item) => (
                <MegaMenuNavLink
                  key={item.label}
                  route={item.slug}
                  menuKey={menuKey}
                  className="group relative block aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-black/5"
                  onNavigate={() => setOpen(false)}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.label}
                      className={cn(
                        'size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]',
                        item.imageClassName,
                      )}
                      containerClassName="absolute inset-0 size-full rounded-none"
                    />
                  ) : (
                    <span className="bg-muted absolute inset-0" />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white sm:text-xs">
                    {item.label}
                  </span>
                </MegaMenuNavLink>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
