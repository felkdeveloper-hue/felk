import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { Button } from '@fe-platform/ui';
import { useLogoutMutation } from '@/hooks';
import { useAuthStore, useUiStore } from '@/store';

export function AdminTopbar() {
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const logout = useLogoutMutation();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button variant="outline" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Menu className="size-4" />
        </Button>
        <label className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Search admin (coming soon)"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm"
            disabled
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button variant="outline" size="sm" aria-label="Notifications" disabled>
          <Bell className="size-4" />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-neutral-900">
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
          </p>
          <p className="text-xs text-neutral-500">{user?.roles[0]}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
