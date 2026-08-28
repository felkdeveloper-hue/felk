import { FeLogo } from '@/components/brand/fe-logo';

/** Full-screen loading shell used while app-level state (e.g. auth) hydrates. */
export function LoadingLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <FeLogo size={56} />
      <div
        className="border-border border-t-foreground h-8 w-8 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
