import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from '@/providers';
import { router } from '@/routes';
import '@/styles/globals.css';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
