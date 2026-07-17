import { Outlet } from '@tanstack/react-router';
import { StorefrontFooter, StorefrontHeader } from '@/components/layout';
import { FloatingSearch } from '@/components/layout/floating-search';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { AccountNav } from '@/components/account';

/** Shell for authenticated account/orders pages. */
export function CustomerLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <StorefrontHeader />
      <div className="safe-pb mx-auto flex w-full max-w-none flex-1 flex-col gap-8 px-4 py-10 sm:px-6 md:px-8 md:pb-10 lg:flex-row lg:px-10 xl:px-14 2xl:px-20">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="border-border/70 bg-card/80 sticky top-28 rounded-[1.75rem] border p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
              Account
            </p>
            <AccountNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <StorefrontFooter />
      <FloatingSearch />
      <MobileBottomNav />
    </div>
  );
}
