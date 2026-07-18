import { Link } from '@tanstack/react-router';
import { ROUTES } from '@/constants';

const FOOTER_LINKS = [
  { label: 'Contact', to: ROUTES.contact },
  { label: 'Privacy Policy', to: ROUTES.privacy },
  { label: 'Terms of Service', to: ROUTES.terms },
];

/** Minimal storefront footer — placeholder until the design system lands. */
export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} FE Platform. All rights reserved.
        </p>
        <nav className="flex flex-wrap gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
