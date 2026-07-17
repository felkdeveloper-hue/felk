import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react';
import { ADMIN_ROUTES } from './routes';
import { PERMISSIONS } from './permissions';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permissions: string[];
  children?: AdminNavItem[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'Dashboard',
    to: ADMIN_ROUTES.dashboard,
    icon: LayoutDashboard,
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ORDERS_VIEW],
  },
  {
    label: 'Products',
    to: ADMIN_ROUTES.products,
    icon: Package,
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
  },
  {
    label: 'Categories',
    to: ADMIN_ROUTES.categories,
    icon: FolderTree,
    permissions: [PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_MANAGE],
  },
  {
    label: 'Collections',
    to: ADMIN_ROUTES.collections,
    icon: Tags,
    permissions: [PERMISSIONS.COLLECTIONS_VIEW, PERMISSIONS.COLLECTIONS_MANAGE],
  },
  {
    label: 'Brands',
    to: ADMIN_ROUTES.brands,
    icon: Tags,
    permissions: [PERMISSIONS.BRANDS_VIEW, PERMISSIONS.BRANDS_MANAGE],
  },
  {
    label: 'Inventory',
    to: ADMIN_ROUTES.inventory,
    icon: Warehouse,
    permissions: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.WAREHOUSE_MANAGE],
  },
  {
    label: 'Orders',
    to: ADMIN_ROUTES.orders,
    icon: ShoppingCart,
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ],
  },
  {
    label: 'Customers',
    to: ADMIN_ROUTES.customers,
    icon: Users,
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
  },
  {
    label: 'CMS',
    to: ADMIN_ROUTES.cms,
    icon: FileText,
    permissions: [PERMISSIONS.CMS_VIEW, PERMISSIONS.PAGES_VIEW, PERMISSIONS.BANNERS_VIEW],
    children: [
      {
        label: 'Pages',
        to: ADMIN_ROUTES.cmsPages,
        icon: FileText,
        permissions: [PERMISSIONS.PAGES_VIEW],
      },
      {
        label: 'Banners',
        to: ADMIN_ROUTES.cmsBanners,
        icon: Megaphone,
        permissions: [PERMISSIONS.BANNERS_VIEW],
      },
      {
        label: 'Home',
        to: ADMIN_ROUTES.cmsHome,
        icon: LayoutDashboard,
        permissions: [PERMISSIONS.CMS_VIEW],
      },
    ],
  },
  {
    label: 'Marketing',
    to: ADMIN_ROUTES.marketing,
    icon: Megaphone,
    permissions: [PERMISSIONS.MARKETING_VIEW, PERMISSIONS.COUPONS_READ],
  },
  {
    label: 'Finance',
    to: ADMIN_ROUTES.finance,
    icon: CreditCard,
    permissions: [PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_RECONCILE],
  },
  {
    label: 'Reports',
    to: ADMIN_ROUTES.reports,
    icon: BarChart3,
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
  },
  {
    label: 'Users',
    to: ADMIN_ROUTES.users,
    icon: Users,
    permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_MANAGE],
  },
  {
    label: 'Roles',
    to: ADMIN_ROUTES.roles,
    icon: Shield,
    permissions: [PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_MANAGE],
  },
  {
    label: 'Settings',
    to: ADMIN_ROUTES.settings,
    icon: Settings,
    permissions: [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE],
  },
  {
    label: 'Audit',
    to: ADMIN_ROUTES.audit,
    icon: Boxes,
    permissions: [PERMISSIONS.AUDIT_READ, PERMISSIONS.ACTIVITY_READ],
  },
];

export function filterNavByPermissions(
  items: AdminNavItem[],
  hasAnyPermission: (permissions: string[]) => boolean,
): AdminNavItem[] {
  return items
    .map((item) => ({
      ...item,
      children: item.children ? filterNavByPermissions(item.children, hasAnyPermission) : undefined,
    }))
    .filter((item) => hasAnyPermission(item.permissions) || (item.children?.length ?? 0) > 0);
}
