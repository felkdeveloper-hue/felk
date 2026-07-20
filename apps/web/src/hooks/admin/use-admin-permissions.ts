import { PERMISSIONS } from '@/constants';
import { useAuthStore } from '@/store';

export function useAdminPermissions() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);

  return {
    user,
    can: hasPermission,
    canAny: hasAnyPermission,
    isRole: hasRole,
    isAnyRole: hasAnyRole,
    products: {
      view: hasPermission(PERMISSIONS.PRODUCTS_VIEW),
      create: hasPermission(PERMISSIONS.PRODUCTS_CREATE),
      update: hasPermission(PERMISSIONS.PRODUCTS_UPDATE),
      delete: hasPermission(PERMISSIONS.PRODUCTS_DELETE),
      publish: hasPermission(PERMISSIONS.PRODUCTS_PUBLISH),
    },
    orders: {
      view: hasAnyPermission([PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ]),
      update: hasPermission(PERMISSIONS.ORDERS_UPDATE),
    },
    customers: {
      view: hasPermission(PERMISSIONS.CUSTOMERS_VIEW),
      update: hasPermission(PERMISSIONS.CUSTOMERS_UPDATE),
    },
    inventory: {
      view: hasAnyPermission([PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.WAREHOUSE_MANAGE]),
      adjust: hasPermission(PERMISSIONS.INVENTORY_ADJUST),
    },
    payments: {
      view: hasPermission(PERMISSIONS.PAYMENTS_VIEW),
      refund: hasPermission(PERMISSIONS.PAYMENTS_REFUND),
    },
  };
}
