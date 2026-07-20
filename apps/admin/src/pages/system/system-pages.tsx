import { PlaceholderModulePage } from '@/components/admin';

export function ReportsPage() {
  return (
    <PlaceholderModulePage
      title="Reports"
      description="Sales, product, customer, and inventory analytics."
      bullets={[
        'Sales overview',
        'Product performance',
        'Customer cohorts',
        'Inventory aging',
        'CSV export',
      ]}
    />
  );
}

export function RolesPage() {
  return (
    <PlaceholderModulePage
      title="Roles & permissions"
      description="Define roles and map permissions for RBAC."
      bullets={[
        'Role CRUD',
        'Permission matrix',
        'Role assignment',
        'Requires backend role admin endpoints',
      ]}
    />
  );
}

export function SettingsPage() {
  return (
    <PlaceholderModulePage
      title="Settings"
      description="Store configuration and platform settings."
      bullets={[
        'Store profile',
        'Checkout settings',
        'Tax and shipping defaults',
        'Notification preferences',
      ]}
    />
  );
}
