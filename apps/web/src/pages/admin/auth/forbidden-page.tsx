import { Link } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { ADMIN_NAV_ITEMS, ADMIN_ROUTES, filterNavByPermissions } from '@/constants';
import { PageMotion } from '@/components/admin';
import { useAuthStore } from '@/store';

export function ForbiddenPage() {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const fallback =
    filterNavByPermissions(ADMIN_NAV_ITEMS, hasAnyPermission)[0]?.to ?? ADMIN_ROUTES.products;

  return (
    <PageMotion>
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-accent)]">
          Restricted
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-[var(--admin-ink)]">
          Access denied
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          You do not have permission for this area. If you believe this is a mistake, ask a super
          admin to review your role.
        </p>
        <Link to={fallback} className="admin-btn admin-btn-primary admin-btn-lg mt-8">
          Go to available page
        </Link>
      </div>
    </PageMotion>
  );
}
