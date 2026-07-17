import { Outlet } from '@tanstack/react-router';
import { AdminBreadcrumbs, AdminSidebar, AdminTopbar } from '@/components/admin';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main id="admin-main" className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AdminBreadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
