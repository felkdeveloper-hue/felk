import { useAuthMeQuery } from '@/hooks';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useAuthMeQuery();
  return <>{children}</>;
}
