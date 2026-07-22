import { Link, useRouterState } from '@tanstack/react-router';
import { ADMIN_NAV_ITEMS, ADMIN_ROUTES, filterNavByPermissions } from '@/constants';
import { useAuthStore, useAdminUiStore } from '@/store';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const collapsed = useAdminUiStore((state) => state.sidebarCollapsed);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const items = filterNavByPermissions(ADMIN_NAV_ITEMS, hasAnyPermission);

  return (
    <aside
      className={cn(
        'relative sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/5 bg-[var(--admin-sidebar)] text-white transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 90% 50% at 20% 0%, rgba(176,141,87,0.16), transparent 55%)',
        }}
      />

      <div className="border-white/8 relative border-b px-4 py-5">
        <Link to={ADMIN_ROUTES.dashboard} className="block">
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70',
              collapsed && 'sr-only',
            )}
          >
            Commerce ops
          </p>
          <p
            className={cn(
              'mt-1 font-serif text-2xl tracking-tight text-white',
              collapsed && 'text-center text-xl',
            )}
          >
            {collapsed ? 'FE' : 'FE Admin'}
          </p>
        </Link>
      </div>

      <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4" aria-label="Admin">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.to ||
            pathname.startsWith(`${item.to}/`) ||
            (item.to === ADMIN_ROUTES.filters && pathname.startsWith('/admin/categories/'));
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-white/55 hover:bg-white/5 hover:text-white',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-[var(--admin-accent-soft)] text-amber-100'
                    : 'bg-white/5 text-white/70 group-hover:text-white',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
              {active && !collapsed ? (
                <span className="ml-auto size-1.5 rounded-full bg-amber-200/80" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-white/8 relative border-t px-4 py-4 text-xs text-white/35',
          collapsed && 'sr-only',
        )}
      >
        Staff console · FE Platform
      </div>
    </aside>
  );
}
