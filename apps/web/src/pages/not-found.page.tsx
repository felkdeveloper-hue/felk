import { ErrorLayout } from '@/layouts';

export function NotFoundPage() {
  return (
    <ErrorLayout title="Page not found" description="The page you're looking for doesn't exist." />
  );
}
