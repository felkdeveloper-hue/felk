import { RouterProvider } from '@tanstack/react-router';
import { AppProviders, AuthBootstrap } from '@/providers';
import { router } from '@/routes';
import '@/styles/globals.css';

export function App() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </AppProviders>
  );
}
