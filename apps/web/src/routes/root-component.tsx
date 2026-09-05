import { Outlet } from '@tanstack/react-router';
import { MetaPixelProvider } from '@/components/analytics/MetaPixelProvider';

export function RootComponent() {
  return (
    <MetaPixelProvider>
      <Outlet />
    </MetaPixelProvider>
  );
}
