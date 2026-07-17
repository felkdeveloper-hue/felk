import { PERMISSIONS } from '@/constants';
import type { AuthUser } from '@/types';

export const adminUserFixture: AuthUser = {
  id: 'user-admin-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['admin'],
  permissions: Object.values(PERMISSIONS),
};

export const limitedUserFixture: AuthUser = {
  id: 'user-limited-1',
  email: 'viewer@example.com',
  firstName: 'View',
  lastName: 'Only',
  roles: ['customer_support'],
  permissions: [PERMISSIONS.ORDERS_VIEW],
};

export const productListFixture = {
  data: [
    {
      id: 'prod-1',
      name: 'Sample Product',
      slug: 'sample-product',
      sku: 'SKU-1',
      status: 'published',
      price: 1500,
      currency: 'LKR',
      variantCount: 2,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  meta: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

export const orderListFixture = {
  data: [
    {
      id: 'ord-1',
      orderNumber: 'ORD-1001',
      status: 'processing',
      currency: 'LKR',
      totals: { grandTotal: 5000, totalQuantity: 2 },
      items: [{ id: 'item-1' }, { id: 'item-2' }],
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  meta: productListFixture.meta,
};
