import { Link } from '@tanstack/react-router';
import { Button } from '@fe-platform/ui';
import { AdminPageHeader, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES } from '@/constants';

export function ForbiddenPage() {
  return (
    <PageMotion>
      <AdminPageHeader
        title="Access denied"
        description="You do not have permission to view this area, or your account is not authorized for admin access."
      />
      <Link to={ADMIN_ROUTES.dashboard} className="inline-flex">
        <Button variant="outline" size="sm">
          Return to dashboard
        </Button>
      </Link>
    </PageMotion>
  );
}
