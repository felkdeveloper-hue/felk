import { Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';
import { Image } from '@/components/media/image';

const AUTH_PANEL_IMAGE =
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&h=2000&q=85';

/** Split fashion panel + form shell for login/register/password-reset flows. */
export function AuthLayout() {
  return (
    <div className="bg-background text-foreground grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src={AUTH_PANEL_IMAGE}
          alt="FE fashion editorial"
          className="absolute inset-0 h-full w-full object-cover"
          containerClassName="absolute inset-0"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
          <Link
            to={ROUTES.home}
            className="font-display text-2xl font-bold uppercase tracking-[-0.04em] text-white transition-opacity hover:opacity-80"
          >
            FE
          </Link>

          <div className="max-w-md space-y-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">
              Fashion Edge
            </p>
            <h2 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-[-0.04em] xl:text-5xl">
              Modern fashion for every day
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/75">
              Sign in to track orders, save your favourites, and shop the latest drops.
            </p>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-svh flex-col">
        <div className="relative h-44 overflow-hidden lg:hidden">
          <Image
            src={AUTH_PANEL_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            containerClassName="absolute inset-0"
            loading="eager"
          />
          <div className="from-background absolute inset-0 bg-gradient-to-t via-black/25 to-black/40" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-4">
            <Link
              to={ROUTES.home}
              className="font-display text-2xl font-bold uppercase tracking-[-0.04em] text-white"
            >
              FE
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">
              Fashion Edge
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            to={ROUTES.home}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to shop
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[420px]">
            <Outlet />
          </div>
        </main>

        <footer className="text-muted-foreground relative z-10 px-6 py-5 text-center text-xs sm:px-10">
          © {new Date().getFullYear()} Fashion Edge · Curated for everyday style
        </footer>
      </div>
    </div>
  );
}
