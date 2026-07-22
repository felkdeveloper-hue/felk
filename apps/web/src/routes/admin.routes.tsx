import { createRoute, redirect } from '@tanstack/react-router';
import { ADMIN_ROUTES, PERMISSIONS } from '@/constants';
import { AdminLayout } from '@/layouts';
import { AdminStaffRoute, AdminPermissionRoute } from '@/guards';
import { PlaceholderModulePage } from '@/components/admin';
import { DashboardPage } from '@/pages/admin/dashboard/dashboard-page';
import { OrdersListPage } from '@/pages/admin/orders/orders-list-page';
import { OrderDetailPage } from '@/pages/admin/orders/order-detail-page';
import { ProductsListPage } from '@/pages/admin/products/products-list-page';
import { ProductFormPage } from '@/pages/admin/products/product-form-page';
import { CollectionsPage } from '@/pages/admin/catalog/catalog-pages';
import { CategoryFormPage } from '@/pages/admin/catalog/category-form-page';
import { FiltersPage } from '@/pages/admin/catalog/filters-page';
import { BannersPage } from '@/pages/admin/cms/banners-page';
import { InventoryPage } from '@/pages/admin/inventory/inventory-page';
import { ForbiddenPage } from '@/pages/admin/auth/forbidden-page';
import { rootRoute } from './root-route';

export const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <AdminStaffRoute>
      <AdminLayout />
    </AdminStaffRoute>
  ),
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.dashboard });
  },
});

const adminForbiddenRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'forbidden',
  component: ForbiddenPage,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'dashboard',
  component: () => (
    <AdminPermissionRoute
      permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ORDERS_VIEW]}
    >
      <DashboardPage />
    </AdminPermissionRoute>
  ),
});

const adminProductsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
      <ProductsListPage />
    </AdminPermissionRoute>
  ),
});

const adminProductNewRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products/new',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_CREATE]}>
      <ProductFormPage />
    </AdminPermissionRoute>
  ),
});

const adminProductDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products/$productId',
  component: function AdminProductDetailRoute() {
    const { productId } = adminProductDetailRoute.useParams();
    return (
      <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
        <ProductFormPage productId={productId} />
      </AdminPermissionRoute>
    );
  },
});

const adminFiltersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'filters',
  component: () => (
    <AdminPermissionRoute
      permissions={[
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_MANAGE,
        PERMISSIONS.BRANDS_VIEW,
        PERMISSIONS.BRANDS_MANAGE,
        PERMISSIONS.PRODUCTS_VIEW,
      ]}
    >
      <FiltersPage />
    </AdminPermissionRoute>
  ),
});

const adminBannersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'banners',
  component: () => (
    <AdminPermissionRoute
      permissions={[PERMISSIONS.BANNERS_VIEW, PERMISSIONS.BANNERS_MANAGE, PERMISSIONS.CMS_MANAGE]}
    >
      <BannersPage />
    </AdminPermissionRoute>
  ),
});

const adminCategoriesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'categories',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.filters, search: { tab: 'categories' } });
  },
});

const adminCategoryDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'categories/$categoryId',
  component: function AdminCategoryDetailRoute() {
    const { categoryId } = adminCategoryDetailRoute.useParams();
    return (
      <AdminPermissionRoute
        permissions={[PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_MANAGE]}
      >
        <CategoryFormPage categoryId={categoryId} />
      </AdminPermissionRoute>
    );
  },
});

const adminInventoryRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'inventory',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.WAREHOUSE_MANAGE]}>
      <InventoryPage />
    </AdminPermissionRoute>
  ),
});

const adminCollectionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'collections',
  component: () => (
    <AdminPermissionRoute
      permissions={[PERMISSIONS.COLLECTIONS_VIEW, PERMISSIONS.COLLECTIONS_MANAGE]}
    >
      <CollectionsPage />
    </AdminPermissionRoute>
  ),
});

const adminBrandsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'brands',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.filters, search: { tab: 'brands' } });
  },
});

const adminSizesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'sizes',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.filters, search: { tab: 'sizes' } });
  },
});

const adminOccasionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'occasions',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.filters, search: { tab: 'occasions' } });
  },
});

const adminOrdersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'orders',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ]}>
      <OrdersListPage />
    </AdminPermissionRoute>
  ),
});

const adminOrderDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'orders/$orderId',
  component: function AdminOrderDetailRoute() {
    const { orderId } = adminOrderDetailRoute.useParams();
    return (
      <AdminPermissionRoute permissions={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ]}>
        <OrderDetailPage orderId={orderId} />
      </AdminPermissionRoute>
    );
  },
});

const adminCustomersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'customers',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.CUSTOMERS_VIEW]}>
      <PlaceholderModulePage title="Customers" description="Customer management coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminCustomerDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'customers/$customerId',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.CUSTOMERS_VIEW]}>
      <PlaceholderModulePage title="Customer" description="Customer detail coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminFinanceRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'finance',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_RECONCILE]}>
      <PlaceholderModulePage title="Finance" description="Finance dashboard coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminReportsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'reports',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT]}>
      <PlaceholderModulePage title="Reports" description="Reporting tools coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'users',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.USERS_READ, PERMISSIONS.USERS_MANAGE]}>
      <PlaceholderModulePage title="Users" description="Staff user management coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminRolesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'roles',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_MANAGE]}>
      <PlaceholderModulePage title="Roles" description="Role management coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'settings',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE]}>
      <PlaceholderModulePage title="Settings" description="Platform settings coming soon." />
    </AdminPermissionRoute>
  ),
});

const adminIntegrationsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'settings/integrations',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.SETTINGS_MANAGE]}>
      <PlaceholderModulePage
        title="Integrations"
        description="Third-party integrations coming soon."
      />
    </AdminPermissionRoute>
  ),
});

const adminAuditRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'audit',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.AUDIT_READ, PERMISSIONS.ACTIVITY_READ]}>
      <PlaceholderModulePage title="Audit log" description="Audit trail coming soon." />
    </AdminPermissionRoute>
  ),
});

export const adminRouteTree = adminLayoutRoute.addChildren([
  adminIndexRoute,
  adminForbiddenRoute,
  adminDashboardRoute,
  adminProductNewRoute,
  adminProductDetailRoute,
  adminProductsRoute,
  adminFiltersRoute,
  adminBannersRoute,
  adminCategoryDetailRoute,
  adminCategoriesRoute,
  adminCollectionsRoute,
  adminBrandsRoute,
  adminSizesRoute,
  adminOccasionsRoute,
  adminInventoryRoute,
  adminOrderDetailRoute,
  adminOrdersRoute,
  adminCustomerDetailRoute,
  adminCustomersRoute,
  adminFinanceRoute,
  adminReportsRoute,
  adminUsersRoute,
  adminRolesRoute,
  adminSettingsRoute,
  adminIntegrationsRoute,
  adminAuditRoute,
]);
