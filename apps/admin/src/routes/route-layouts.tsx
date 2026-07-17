import { Outlet } from '@tanstack/react-router';
import { ProtectedRoute } from '@/guards';
import { AdminLayout } from '@/layouts';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <Outlet />
    </div>
  );
}

export function AdminShell() {
  return (
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  );
}
