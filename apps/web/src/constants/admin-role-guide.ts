/** Human-readable role guide shown when creating / assigning users in admin. */
export const ADMIN_ROLE_OPTIONS = [
  {
    label: 'Customer',
    value: 'customer',
    summary: 'Storefront shopper only — no admin access.',
  },
  {
    label: 'Sub-admin',
    value: 'sub_admin',
    summary:
      'Limited admin: products, orders, customers, CMS, inventory, analytics. Cannot manage users, roles, refunds, or system settings.',
  },
  {
    label: 'Manager',
    value: 'manager',
    summary:
      'Broader ops than sub-admin (catalog, inventory, orders, CMS). Still no user management.',
  },
  {
    label: 'Support',
    value: 'customer_support',
    summary: 'Customers, orders help-desk, reviews. No catalog or inventory edits.',
  },
  {
    label: 'Finance',
    value: 'finance',
    summary: 'Payments, refunds, invoices, reports. No product catalog edits.',
  },
  {
    label: 'Inventory manager',
    value: 'inventory_manager',
    summary: 'Stock, warehouses, purchase orders.',
  },
  {
    label: 'Marketing manager',
    value: 'marketing_manager',
    summary: 'Banners, pages, coupons, marketing content.',
  },
  {
    label: 'Warehouse staff',
    value: 'warehouse_staff',
    summary: 'Stock adjustments and order fulfillment helpers.',
  },
  {
    label: 'Admin',
    value: 'admin',
    summary: 'Full admin except role permission matrix. Super admin only can assign this.',
  },
  {
    label: 'Super admin',
    value: 'super_admin',
    summary: 'Full access including roles. Super admin only can assign this.',
  },
] as const;

export function roleSummary(roleKey: string): string {
  return ADMIN_ROLE_OPTIONS.find((r) => r.value === roleKey)?.summary ?? '';
}
