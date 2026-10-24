import { RouterProvider } from '@tanstack/react-router';
import { maintenanceMode } from '@/config/maintenance';
import { MaintenanceLayout } from '@/layouts/maintenance-layout';
import { AppProviders } from '@/providers';
import { router } from '@/routes';
import '@/styles/globals.css';

export function App() {
  if (maintenanceMode) {
    return <MaintenanceLayout />;
  }

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
