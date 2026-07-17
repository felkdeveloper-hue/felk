import { Link, Outlet } from '@tanstack/react-router';
import { ROUTES } from '@/constants';

/** Centered card shell for login/register/password-reset flows. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <Link to={ROUTES.home} className="mb-8 text-lg font-semibold tracking-tight">
        FE Platform
      </Link>
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Outlet />
      </div>
    </div>
  );
}
