/**
 * Common domain enums and base entity shapes.
 * Full models will be implemented in apps/api.
 */

export type ID = string;

export interface BaseEntity {
  _id: ID;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'customer' | 'admin' | 'super_admin' | 'editor' | 'support';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export type PaymentStatus =
  'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export type ProductStatus = 'draft' | 'active' | 'archived' | 'out_of_stock';
