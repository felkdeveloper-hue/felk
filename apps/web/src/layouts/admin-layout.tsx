import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AdminBreadcrumbs, AdminSidebar, AdminTopbar } from '@/components/admin';
import { useAdminUiStore } from '@/store';

export function AdminLayout() {
  const theme = useAdminUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-[var(--admin-surface)] text-[var(--admin-ink)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--admin-ink)] focus:px-4 focus:py-2 focus:text-[var(--admin-surface)]"
      >
        Skip to main content
      </a>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main id="admin-main" className="flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-6">
          <AdminBreadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
