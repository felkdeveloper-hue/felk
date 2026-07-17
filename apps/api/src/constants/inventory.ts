/**
 * Inventory & Warehouse module constants (Phase 6).
 */

export const INVENTORY_PERMISSIONS = {
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_RESERVE: 'inventory.reserve',
  INVENTORY_EXPORT: 'inventory.export',
  WAREHOUSE_MANAGE: 'warehouse.manage',
  SUPPLIER_MANAGE: 'supplier.manage',
  PURCHASE_ORDER_MANAGE: 'purchase-order.manage',
} as const;

/** Expanded movement types beyond core ledger enums. */
export const MOVEMENT_TYPE = {
  RECEIVE: 'receive',
  RESERVE: 'reserve',
  RELEASE: 'release',
  COMMIT: 'commit',
  ADJUSTMENT: 'adjustment',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  RETURN: 'return',
  DAMAGE: 'damage',
  MANUAL_CORRECTION: 'manual_correction',
} as const;

export type MovementType = (typeof MOVEMENT_TYPE)[keyof typeof MOVEMENT_TYPE];

export const RESERVATION_STATUS = {
  ACTIVE: 'active',
  COMMITTED: 'committed',
  RELEASED: 'released',
  EXPIRED: 'expired',
} as const;

export const TRANSFER_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type TransferStatus = (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];

export const PO_STATUS = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIAL: 'partial',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type PurchaseOrderStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

export const ALERT_TYPE = {
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  NEGATIVE_ATTEMPT: 'negative_stock_attempt',
  RESERVATION_EXPIRY: 'reservation_expiry',
  REORDER: 'reorder_alert',
} as const;

export const ALERT_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
} as const;

export const WAREHOUSE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export const INVENTORY_AUDIT = {
  STOCK_CHANGE: 'inventory.stock_change',
  RESERVATION: 'inventory.reservation',
  ADJUSTMENT: 'inventory.adjustment',
  TRANSFER: 'inventory.transfer',
  SUPPLIER_CHANGE: 'inventory.supplier_change',
  WAREHOUSE_CHANGE: 'inventory.warehouse_change',
  PURCHASE_ORDER_CHANGE: 'inventory.purchase_order_change',
} as const;

/** Default reservation TTL in minutes when not provided. */
export const DEFAULT_RESERVATION_TTL_MINUTES = 30;
