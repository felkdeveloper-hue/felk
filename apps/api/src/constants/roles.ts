/**
 * Role keys — catalog only. No RBAC enforcement logic here.
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  INVENTORY_MANAGER: 'inventory_manager',
  MARKETING_MANAGER: 'marketing_manager',
  CUSTOMER_SUPPORT: 'customer_support',
  FINANCE: 'finance',
  WAREHOUSE_STAFF: 'warehouse_staff',
  CUSTOMER: 'customer',
  GUEST: 'guest',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LIST = Object.values(ROLES);
