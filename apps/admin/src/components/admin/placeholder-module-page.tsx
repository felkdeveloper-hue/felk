import { Link } from '@tanstack/react-router';
import { Button } from '@fe-platform/ui';
import { AdminPageHeader, AdminPanel } from './admin-page-header';

export function PlaceholderModulePage({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <AdminPanel>
        <p className="text-sm text-neutral-600">
          This module is wired into navigation and RBAC. Backend endpoints for full CRUD will
          connect here without changing the admin shell.
        </p>
        {bullets?.length ? (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-600">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </AdminPanel>
    </>
  );
}

export function ModuleHubPage({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: Array<{ label: string; to: string; description: string }>;
}) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <AdminPanel key={link.to}>
            <h3 className="font-medium text-neutral-900">{link.label}</h3>
            <p className="mt-2 text-sm text-neutral-500">{link.description}</p>
            <Link to={link.to} className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Open
              </Button>
            </Link>
          </AdminPanel>
        ))}
      </div>
    </>
  );
}
