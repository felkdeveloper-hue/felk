import { Bell, CircleUser, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared Lucide props — minimal premium outline style. */
export const NAVBAR_ICON = {
  size: 21,
  strokeWidth: 1.5,
  className: 'size-[21px] shrink-0',
} as const;

export function NavbarBellIcon({ className }: { className?: string }) {
  return (
    <Bell
      size={NAVBAR_ICON.size}
      strokeWidth={NAVBAR_ICON.strokeWidth}
      className={cn(NAVBAR_ICON.className, className)}
      aria-hidden
    />
  );
}

export function NavbarProfileIcon({ className }: { className?: string }) {
  return (
    <CircleUser
      size={NAVBAR_ICON.size}
      strokeWidth={NAVBAR_ICON.strokeWidth}
      className={cn(NAVBAR_ICON.className, className)}
      aria-hidden
    />
  );
}

export function NavbarBagIcon({ className }: { className?: string }) {
  return (
    <ShoppingBag
      size={NAVBAR_ICON.size}
      strokeWidth={NAVBAR_ICON.strokeWidth}
      className={cn(NAVBAR_ICON.className, className)}
      aria-hidden
    />
  );
}

interface NavbarIconBadgeProps {
  count: number;
  className?: string;
}

/** Small subtle count badge — circular via data-radius="pill". */
export function NavbarIconBadge({ count, className }: NavbarIconBadgeProps) {
  const display = count > 9 ? '9+' : String(count);

  return (
    <span
      data-radius="pill"
      className={cn(
        'pointer-events-none absolute flex items-center justify-center font-semibold leading-none text-white',
        className,
      )}
      style={{
        minWidth: 14,
        height: 14,
        padding: '0 3px',
        fontSize: 8,
        background: '#E53935',
      }}
    >
      {display}
    </span>
  );
}

/** 40×40 tap target with centered icon — use on all navbar action buttons. */
export function navbarActionBtnClass(lightChrome: boolean, className?: string) {
  return cn(
    'relative !size-10 shrink-0 items-center justify-center',
    '[&_svg]:size-[21px] [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
    lightChrome
      ? 'text-white hover:bg-white/10 hover:text-white'
      : 'text-foreground hover:bg-muted/70 hover:text-foreground',
    className,
  );
}

/** Lucide props for icons outside navbar-action-icons (e.g. Heart, Search). */
export function navbarLucideIconProps() {
  return {
    size: NAVBAR_ICON.size,
    strokeWidth: NAVBAR_ICON.strokeWidth,
    className: NAVBAR_ICON.className,
  } as const;
}
