import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { ADMIN_ROUTES, PERMISSIONS } from '@/constants';
import { PermissionRoute } from '@/guards';
import {
  AuditPage,
  BrandsPage,
  CategoriesPage,
  CmsBannersPage,
  CmsHomePage,
  CmsHubPage,
  CmsPagesPage,
  CollectionsPage,
  CustomerDetailPage,
  CustomersListPage,
  DashboardPage,
  FinancePage,
  ForbiddenPage,
  InventoryPage,
  LoginPage,
  MarketingPage,
  OrderDetailPage,
  OrdersListPage,
  ProductFormPage,
  ProductsListPage,
  ReportsPage,
  RolesPage,
  SettingsPage,
  UsersPage,
} from '@/pages';
import { AdminShell, RootLayout } from './route-layouts';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.dashboard });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminShell,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: ADMIN_ROUTES.dashboard });
  },
});

const forbiddenRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'forbidden',
  component: ForbiddenPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'dashboard',
  component: () => (
    <PermissionRoute
      permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ORDERS_VIEW]}
    >
      <DashboardPage />
    </PermissionRoute>
  ),
});

const productsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
      <ProductsListPage />
    </PermissionRoute>
  ),
});

const productNewRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products/new',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_CREATE]}>
      <ProductFormPage />
    </PermissionRoute>
  ),
});

const productDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products/$productId',
  component: function ProductDetailRoute() {
    const { productId } = productDetailRoute.useParams();
    return (
      <PermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
        <ProductFormPage productId={productId} />
      </PermissionRoute>
    );
  },
});

const categoriesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'categories',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_MANAGE]}>
      <CategoriesPage />
    </PermissionRoute>
  ),
});

const collectionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'collections',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.COLLECTIONS_VIEW, PERMISSIONS.COLLECTIONS_MANAGE]}>
      <CollectionsPage />
    </PermissionRoute>
  ),
});

const brandsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'brands',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.BRANDS_VIEW, PERMISSIONS.BRANDS_MANAGE]}>
      <BrandsPage />
    </PermissionRoute>
  ),
});

const inventoryRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'inventory',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.WAREHOUSE_MANAGE]}>
      <InventoryPage />
    </PermissionRoute>
  ),
});

const ordersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'orders',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ]}>
      <OrdersListPage />
    </PermissionRoute>
  ),
});

const orderDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'orders/$orderId',
  component: function OrderDetailRouteComponent() {
    const { orderId } = orderDetailRoute.useParams();
    return (
      <PermissionRoute permissions={[PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_READ]}>
        <OrderDetailPage orderId={orderId} />
      </PermissionRoute>
    );
  },
});

const customersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'customers',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.CUSTOMERS_VIEW]}>
      <CustomersListPage />
    </PermissionRoute>
  ),
});

const customerDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'customers/$customerId',
  component: function CustomerDetailRouteComponent() {
    const { customerId } = customerDetailRoute.useParams();
    return (
      <PermissionRoute permissions={[PERMISSIONS.CUSTOMERS_VIEW]}>
        <CustomerDetailPage customerId={customerId} />
      </PermissionRoute>
    );
  },
});

const cmsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'cms',
  component: () => (
    <PermissionRoute
      permissions={[PERMISSIONS.CMS_VIEW, PERMISSIONS.PAGES_VIEW, PERMISSIONS.BANNERS_VIEW]}
    >
      <CmsHubPage />
    </PermissionRoute>
  ),
});

const cmsPagesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'cms/pages',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.PAGES_VIEW]}>
      <CmsPagesPage />
    </PermissionRoute>
  ),
});

const cmsBannersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'cms/banners',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.BANNERS_VIEW]}>
      <CmsBannersPage />
    </PermissionRoute>
  ),
});

const cmsHomeRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'cms/home',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.CMS_VIEW]}>
      <CmsHomePage />
    </PermissionRoute>
  ),
});

const marketingRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'marketing',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.MARKETING_VIEW, PERMISSIONS.COUPONS_READ]}>
      <MarketingPage />
    </PermissionRoute>
  ),
});

const financeRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'finance',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_RECONCILE]}>
      <FinancePage />
    </PermissionRoute>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'reports',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT]}>
      <ReportsPage />
    </PermissionRoute>
  ),
});

const usersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'users',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.USERS_READ, PERMISSIONS.USERS_MANAGE]}>
      <UsersPage />
    </PermissionRoute>
  ),
});

const rolesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'roles',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_MANAGE]}>
      <RolesPage />
    </PermissionRoute>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'settings',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE]}>
      <SettingsPage />
    </PermissionRoute>
  ),
});

const auditRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'audit',
  component: () => (
    <PermissionRoute permissions={[PERMISSIONS.AUDIT_READ, PERMISSIONS.ACTIVITY_READ]}>
      <AuditPage />
    </PermissionRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminLayoutRoute.addChildren([
    adminIndexRoute,
    forbiddenRoute,
    dashboardRoute,
    productNewRoute,
    productDetailRoute,
    productsRoute,
    categoriesRoute,
    collectionsRoute,
    brandsRoute,
    inventoryRoute,
    orderDetailRoute,
    ordersRoute,
    customerDetailRoute,
    customersRoute,
    cmsPagesRoute,
    cmsBannersRoute,
    cmsHomeRoute,
    cmsRoute,
    marketingRoute,
    financeRoute,
    reportsRoute,
    usersRoute,
    rolesRoute,
    settingsRoute,
    auditRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
