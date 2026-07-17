import { Link, useRouterState } from '@tanstack/react-router';
import { ADMIN_NAV_ITEMS, filterNavByPermissions } from '@/constants';
import { useAuthStore, useUiStore } from '@/store';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const items = filterNavByPermissions(ADMIN_NAV_ITEMS, hasAnyPermission);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-neutral-200 bg-white transition-all',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="border-b border-neutral-200 px-4 py-4">
        <p className={cn('font-semibold text-neutral-900', collapsed && 'sr-only')}>
          Commerce Admin
        </p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
