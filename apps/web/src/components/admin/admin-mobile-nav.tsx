import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { ADMIN_ROUTES } from '@/constants';
import { AdminNavLinks } from '@/components/admin/admin-sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAdminUiStore } from '@/store';

/** Full-height premium mobile nav drawer for admin (desktop keeps the sticky sidebar). */
export function AdminMobileNav() {
  const open = useAdminUiStore((state) => state.mobileNavOpen);
  const setOpen = useAdminUiStore((state) => state.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        showClose={false}
        className="z-[120] flex h-dvh w-[min(100vw,20rem)] max-w-none flex-col gap-0 border-0 bg-[var(--admin-sidebar)] p-0 text-white sm:max-w-sm lg:hidden"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse 90% 50% at 20% 0%, rgba(176,141,87,0.18), transparent 55%)',
          }}
        />

        <SheetHeader className="border-white/8 relative flex flex-row items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
              Commerce ops
            </p>
            <SheetTitle className="mt-1 font-serif text-2xl tracking-tight text-white">
              <Link to={ADMIN_ROUTES.dashboard} onClick={() => setOpen(false)}>
                FE Admin
              </Link>
            </SheetTitle>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition active:scale-95"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </SheetHeader>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <AdminNavLinks onNavigate={() => setOpen(false)} />
          <p className="mt-8 px-3 text-xs text-white/35">Staff console · FE Platform</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
