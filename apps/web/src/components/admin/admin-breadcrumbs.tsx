import { ChevronRight } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ADMIN_ROUTES } from '@/constants';

const LABELS: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  categories: 'Categories',
  collections: 'Collections',
  brands: 'Brands',
  sizes: 'Sizes',
  occasions: 'Occasions',
  inventory: 'Inventory',
  finance: 'Finance',
  reports: 'Reports',
  users: 'Users',
  roles: 'Roles',
  settings: 'Settings',
  audit: 'Audit',
  new: 'New',
  forbidden: 'Access denied',
};

export function AdminBreadcrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const label = LABELS[segment] ?? segment;
    return { href, label, isLast: index === segments.length - 1 };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"
    >
      <Link to={ADMIN_ROUTES.dashboard} className="transition hover:text-[var(--admin-ink)]">
        Dashboard
      </Link>
      {crumbs.slice(1).map((crumb) => (
        <span key={crumb.href} className="inline-flex items-center gap-1">
          <ChevronRight className="size-3.5 opacity-50" aria-hidden />
          {crumb.isLast ? (
            <span className="font-medium text-[var(--admin-ink)]">{crumb.label}</span>
          ) : (
            <Link to={crumb.href} className="transition hover:text-[var(--admin-ink)]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
