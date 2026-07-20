import { Link, useRouterState } from '@tanstack/react-router';
import {
  Heart,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { ROUTES } from '@/constants';
import { useLogoutMutation } from '@/hooks/auth';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Overview', to: ROUTES.account, icon: LayoutGrid },
  { label: 'My Orders', to: ROUTES.accountOrders, icon: Package },
  { label: 'Returns', to: ROUTES.accountReturns, icon: RotateCcw },
  { label: 'Wishlist', to: ROUTES.wishlist, icon: Heart },
  { label: 'My Addresses', to: ROUTES.accountAddresses, icon: MapPin },
  { label: 'My Profile', to: ROUTES.accountProfile, icon: User },
  { label: 'Security', to: ROUTES.accountSecurity, icon: Shield },
  { label: 'Preferences', to: ROUTES.accountPreferences, icon: Settings },
] as const;

export function AccountNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const logoutMutation = useLogoutMutation();

  return (
    <nav aria-label="Account" className="flex flex-col">
      <div className="flex flex-col gap-0.5">
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
                'relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                'text-muted-foreground hover:text-foreground',
                active && 'text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span
                  className="bg-foreground absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                  aria-hidden
                />
              ) : null}
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-border mt-4 border-t pt-3">
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className={cn(
            'text-destructive hover:bg-destructive/5 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
            'disabled:pointer-events-none disabled:opacity-60',
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {logoutMutation.isPending ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </nav>
  );
}
