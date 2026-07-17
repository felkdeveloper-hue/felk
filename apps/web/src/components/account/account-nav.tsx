import { Link, useRouterState } from '@tanstack/react-router';
import { MapPin, Package, RotateCcw, Settings, Shield, User } from 'lucide-react';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Overview', to: ROUTES.account, icon: User },
  { label: 'Orders', to: ROUTES.accountOrders, icon: Package },
  { label: 'Returns', to: ROUTES.accountReturns, icon: RotateCcw },
  { label: 'Profile', to: ROUTES.accountProfile, icon: User },
  { label: 'Addresses', to: ROUTES.accountAddresses, icon: MapPin },
  { label: 'Security', to: ROUTES.accountSecurity, icon: Shield },
  { label: 'Preferences', to: ROUTES.accountPreferences, icon: Settings },
] as const;

export function AccountNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.to === ROUTES.account
            ? pathname === ROUTES.account
            : pathname === item.to || pathname.startsWith(`${item.to}/`);

        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active && 'bg-accent text-accent-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
