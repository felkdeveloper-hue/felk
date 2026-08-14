import { lazy, Suspense } from 'react';
import { createRoute, Outlet, redirect } from '@tanstack/react-router';
import { ADMIN_ROUTES, PERMISSIONS } from '@/constants';
import { AdminLayout } from '@/layouts';
import { AdminStaffRoute, AdminPermissionRoute } from '@/guards';
import { PlaceholderModulePage } from '@/components/admin';
import { Skeleton } from '@/components/ui/skeleton';
import { rootRoute } from './root-route';

/** Keep admin pages out of the storefront JS bundle. */
const DashboardPage = lazy(() =>
  import('@/pages/admin/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const OrdersListPage = lazy(() =>
  import('@/pages/admin/orders/orders-list-page').then((m) => ({ default: m.OrdersListPage })),
);
const OrderDetailPage = lazy(() =>
  import('@/pages/admin/orders/order-detail-page').then((m) => ({ default: m.OrderDetailPage })),
);
const ProductsListPage = lazy(() =>
  import('@/pages/admin/products/products-list-page').then((m) => ({
    default: m.ProductsListPage,
  })),
);
const ProductFormPage = lazy(() =>
  import('@/pages/admin/products/product-form-page').then((m) => ({ default: m.ProductFormPage })),
);
const UsersListPage = lazy(() =>
  import('@/pages/admin/users/users-list-page').then((m) => ({ default: m.UsersListPage })),
);
const UserDetailPage = lazy(() =>
  import('@/pages/admin/users/user-detail-page').then((m) => ({ default: m.UserDetailPage })),
);
const CollectionsPage = lazy(() =>
  import('@/pages/admin/catalog/catalog-pages').then((m) => ({ default: m.CollectionsPage })),
);
const CategoryFormPage = lazy(() =>
  import('@/pages/admin/catalog/category-form-page').then((m) => ({ default: m.CategoryFormPage })),
);
const FiltersPage = lazy(() =>
  import('@/pages/admin/catalog/filters-page').then((m) => ({ default: m.FiltersPage })),
);
const BannersPage = lazy(() =>
  import('@/pages/admin/cms/banners-page').then((m) => ({ default: m.BannersPage })),
);
const MegaMenuPage = lazy(() =>
  import('@/pages/admin/cms/mega-menu-page').then((m) => ({ default: m.MegaMenuPage })),
);
const InventoryPage = lazy(() =>
  import('@/pages/admin/inventory/inventory-page').then((m) => ({ default: m.InventoryPage })),
);
const ForbiddenPage = lazy(() =>
  import('@/pages/admin/auth/forbidden-page').then((m) => ({ default: m.ForbiddenPage })),
);

function AdminLazyFallback() {
  return (
    <div className="space-y-4 py-2" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

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
      <Suspense fallback={<AdminLazyFallback />}>
        <DashboardPage />
      </Suspense>
    </AdminPermissionRoute>
  ),
});

const adminProductsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'products',
  component: () => <Outlet />,
});

const adminProductsIndexRoute = createRoute({
  getParentRoute: () => adminProductsRoute,
  path: '/',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
      <Suspense fallback={<AdminLazyFallback />}>
        <ProductsListPage />
      </Suspense>
    </AdminPermissionRoute>
  ),
});

const adminProductNewRoute = createRoute({
  getParentRoute: () => adminProductsRoute,
  path: 'new',
  component: () => (
    <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_CREATE]}>
      <Suspense fallback={<AdminLazyFallback />}>
        <ProductFormPage />
      </Suspense>
    </AdminPermissionRoute>
  ),
});

const adminProductDetailRoute = createRoute({
  getParentRoute: () => adminProductsRoute,
  path: '$productId',
  component: function AdminProductDetailRoute() {
    const { productId } = adminProductDetailRoute.useParams();
    return (
      <AdminPermissionRoute permissions={[PERMISSIONS.PRODUCTS_VIEW]}>
        <Suspense fallback={<AdminLazyFallback />}>
          <ProductFormPage productId={productId} />
        </Suspense>
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

const adminMegaMenuRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'mega-menu',
  component: () => (
    <AdminPermissionRoute
      permissions={[PERMISSIONS.BANNERS_VIEW, PERMISSIONS.BANNERS_MANAGE, PERMISSIONS.CMS_MANAGE]}
    >
      <MegaMenuPage />
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

const CustomerDetailPage = lazy(() =>
  import('@/pages/admin/customers/customer-detail-page').then((m) => ({
    default: m.CustomerDetailPage,
  })),
);

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
  component: function AdminCustomerDetailRoute() {
    const { customerId } = adminCustomerDetailRoute.useParams();
    return (
      <AdminPermissionRoute permissions={[PERMISSIONS.CUSTOMERS_VIEW]}>
        <Suspense fallback={<AdminLazyFallback />}>
          <CustomerDetailPage customerId={customerId} />
        </Suspense>
      </AdminPermissionRoute>
    );
  },
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
      <Suspense fallback={<AdminLazyFallback />}>
        <UsersListPage />
      </Suspense>
    </AdminPermissionRoute>
  ),
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'users/$userId',
  component: function AdminUserDetailRoute() {
    const { userId } = adminUserDetailRoute.useParams();
    return (
      <AdminPermissionRoute permissions={[PERMISSIONS.USERS_READ, PERMISSIONS.USERS_MANAGE]}>
        <Suspense fallback={<AdminLazyFallback />}>
          <UserDetailPage userId={userId} />
        </Suspense>
      </AdminPermissionRoute>
    );
  },
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

// ─── Analytics routes ─────────────────────────────────────────────────────────

const AnalyticsOverviewPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-overview-page').then((m) => ({
    default: m.AnalyticsOverviewPage,
  })),
);
const AnalyticsVisitorsPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-visitors-page').then((m) => ({
    default: m.AnalyticsVisitorsPage,
  })),
);
const AnalyticsSessionsPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-sessions-page').then((m) => ({
    default: m.AnalyticsSessionsPage,
  })),
);
const AnalyticsPagesPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-pages-page').then((m) => ({
    default: m.AnalyticsPagesPage,
  })),
);
const AnalyticsLivePage = lazy(() =>
  import('@/pages/admin/analytics/analytics-live-page').then((m) => ({
    default: m.AnalyticsLivePage,
  })),
);
const AnalyticsEventsPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-events-page').then((m) => ({
    default: m.AnalyticsEventsPage,
  })),
);
const AnalyticsDevicesPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-devices-page').then((m) => ({
    default: m.AnalyticsDevicesPage,
  })),
);
const AnalyticsGeoPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-geo-page').then((m) => ({
    default: m.AnalyticsGeoPage,
  })),
);
const AnalyticsTrafficPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-traffic-page').then((m) => ({
    default: m.AnalyticsTrafficPage,
  })),
);
const AnalyticsProductsPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-products-page').then((m) => ({
    default: m.AnalyticsProductsPage,
  })),
);
const AnalyticsCartPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-cart-page').then((m) => ({
    default: m.AnalyticsCartPage,
  })),
);
const AnalyticsWishlistPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-wishlist-page').then((m) => ({
    default: m.AnalyticsWishlistPage,
  })),
);
const AnalyticsRecoveryPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-recovery-page').then((m) => ({
    default: m.AnalyticsRecoveryPage,
  })),
);
const AnalyticsReturningPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-returning-page').then((m) => ({
    default: m.AnalyticsReturningPage,
  })),
);
const AnalyticsSearchPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-search-page').then((m) => ({
    default: m.AnalyticsSearchPage,
  })),
);
const AnalyticsFunnelPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-funnel-page').then((m) => ({
    default: m.AnalyticsFunnelPage,
  })),
);
const AnalyticsActivityPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-activity-page').then((m) => ({
    default: m.AnalyticsActivityPage,
  })),
);
const AnalyticsCheckoutPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-checkout-page').then((m) => ({
    default: m.AnalyticsCheckoutPage,
  })),
);
const AnalyticsRevenuePage = lazy(() =>
  import('@/pages/admin/analytics/analytics-revenue-page').then((m) => ({
    default: m.AnalyticsRevenuePage,
  })),
);
const AnalyticsExportsPage = lazy(() =>
  import('@/pages/admin/analytics/analytics-exports-page').then((m) => ({
    default: m.AnalyticsExportsPage,
  })),
);

const analyticsPerms = [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW];

function AnalyticsWrap({ children }: { children: React.ReactNode }) {
  return (
    <AdminPermissionRoute permissions={analyticsPerms}>
      <Suspense fallback={<AdminLazyFallback />}>{children}</Suspense>
    </AdminPermissionRoute>
  );
}

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsOverviewPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsVisitorsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/visitors',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsVisitorsPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsSessionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/sessions',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsSessionsPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsPagesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/pages',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsPagesPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsLiveRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/live',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsLivePage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsEventsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/events',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsEventsPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsDevicesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/devices',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsDevicesPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsGeoRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/geo',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsGeoPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsTrafficRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/traffic',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsTrafficPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsProductsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/products',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsProductsPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsCartRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/cart',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsCartPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsWishlistRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/wishlist',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsWishlistPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsRecoveryRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/recovery',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsRecoveryPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsReturningRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/returning',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsReturningPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsSearchRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/search',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsSearchPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsFunnelRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/funnel',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsFunnelPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsActivityRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/activity',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsActivityPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsCheckoutRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/checkout',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsCheckoutPage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsRevenueRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/revenue',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsRevenuePage />
    </AnalyticsWrap>
  ),
});

const adminAnalyticsExportsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics/exports',
  component: () => (
    <AnalyticsWrap>
      <AnalyticsExportsPage />
    </AnalyticsWrap>
  ),
});

export const adminRouteTree = adminLayoutRoute.addChildren([
  adminIndexRoute,
  adminForbiddenRoute,
  adminDashboardRoute,
  adminProductsRoute.addChildren([
    adminProductsIndexRoute,
    adminProductNewRoute,
    adminProductDetailRoute,
  ]),
  adminFiltersRoute,
  adminBannersRoute,
  adminMegaMenuRoute,
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
  adminUserDetailRoute,
  adminRolesRoute,
  adminSettingsRoute,
  adminIntegrationsRoute,
  adminAuditRoute,
  adminAnalyticsRoute,
  adminAnalyticsVisitorsRoute,
  adminAnalyticsSessionsRoute,
  adminAnalyticsPagesRoute,
  adminAnalyticsLiveRoute,
  adminAnalyticsEventsRoute,
  adminAnalyticsDevicesRoute,
  adminAnalyticsGeoRoute,
  adminAnalyticsTrafficRoute,
  adminAnalyticsProductsRoute,
  adminAnalyticsCartRoute,
  adminAnalyticsWishlistRoute,
  adminAnalyticsRecoveryRoute,
  adminAnalyticsReturningRoute,
  adminAnalyticsSearchRoute,
  adminAnalyticsFunnelRoute,
  adminAnalyticsActivityRoute,
  adminAnalyticsCheckoutRoute,
  adminAnalyticsRevenueRoute,
  adminAnalyticsExportsRoute,
]);
