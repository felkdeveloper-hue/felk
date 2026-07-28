import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useLogoutMutation } from '@/hooks/auth';
import { useAuthStore, useAdminUiStore } from '@/store';
import { cn } from '@/lib/utils';

export function AdminTopbar() {
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = useAdminUiStore((state) => state.toggleSidebar);
  const setMobileNavOpen = useAdminUiStore((state) => state.setMobileNavOpen);
  const theme = useAdminUiStore((state) => state.theme);
  const toggleTheme = useAdminUiStore((state) => state.toggleTheme);
  const logout = useLogoutMutation();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Staff';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const iconBtn =
    'inline-flex size-11 items-center justify-center rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] text-[var(--admin-ink)] transition active:scale-95 lg:size-9 lg:rounded-lg';

  return (
    <header
      className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-[var(--admin-line)] bg-[color-mix(in_srgb,var(--admin-panel)_92%,transparent)] px-3 backdrop-blur-md sm:gap-4 sm:px-4 lg:h-16 lg:px-6"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Mobile: open nav sheet */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className={cn(iconBtn, 'lg:hidden')}
        >
          <Menu className="size-5 lg:size-4" />
        </button>
        {/* Desktop: collapse rail */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className={cn(iconBtn, 'hidden lg:inline-flex')}
        >
          <Menu className="size-4" />
        </button>

        <div className="min-w-0 lg:hidden">
          <p className="truncate font-serif text-lg tracking-tight text-[var(--admin-ink)]">
            FE Admin
          </p>
        </div>

        <label className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Search catalog, orders, customers…"
            className="focus:border-[var(--admin-accent)]/40 focus:ring-[var(--admin-accent)]/25 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-1"
            disabled
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className={iconBtn}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          disabled
          className={cn(iconBtn, 'hidden text-neutral-500 opacity-60 sm:inline-flex')}
        >
          <Bell className="size-4" />
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] py-1 pl-1 pr-1.5 sm:pr-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--admin-ink)] text-xs font-semibold text-[var(--admin-surface)] lg:size-8">
            {initials || 'FE'}
          </span>
          <div className="hidden text-left sm:block">
            <p className="max-w-[9rem] truncate text-sm font-medium leading-tight text-[var(--admin-ink)]">
              {displayName}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {user?.roles[0] ?? 'staff'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label={logout.isPending ? 'Signing out' : 'Sign out'}
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 sm:hidden dark:text-neutral-400 dark:hover:bg-white/10"
          >
            <LogOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="ml-1 hidden rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-[var(--admin-ink)] disabled:opacity-60 sm:inline dark:text-neutral-400 dark:hover:bg-white/10"
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}
