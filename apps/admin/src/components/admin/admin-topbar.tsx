import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useLogoutMutation } from '@/hooks';
import { useAuthStore, useUiStore } from '@/store';

export function AdminTopbar() {
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const logout = useLogoutMutation();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Staff';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[var(--admin-line)] bg-[color-mix(in_srgb,var(--admin-panel)_88%,transparent)] px-4 backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] text-[var(--admin-ink)] transition hover:bg-white dark:hover:bg-white/10"
        >
          <Menu className="size-4" />
        </button>
        <label className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Search catalog, orders, customers…"
            className="focus:border-[var(--admin-accent)]/40 focus:ring-[var(--admin-accent)]/25 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-1"
            disabled
          />
        </label>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] text-[var(--admin-ink)] transition hover:bg-white dark:hover:bg-white/10"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          disabled
          className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] text-neutral-500 opacity-60"
        >
          <Bell className="size-4" />
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] py-1.5 pl-1.5 pr-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--admin-ink)] text-xs font-semibold text-[var(--admin-surface)]">
            {initials || 'FE'}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-[var(--admin-ink)]">
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
            className="ml-1 hidden rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-[var(--admin-ink)] disabled:opacity-60 sm:inline dark:text-neutral-400 dark:hover:bg-white/10"
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}
