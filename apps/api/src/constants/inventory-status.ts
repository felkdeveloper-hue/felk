export const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  BACKORDER: 'backorder',
} as const;

/**
 * A variant is low stock when it still has units, but fewer than this many.
 * "Less than 2" means 1 unit left. 0 is out of stock, not low stock.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 1;

export const PRODUCT_STOCK_FILTERS = [
  'in_stock',
  'out_of_stock',
  'low_stock',
  'has_out_variant',
] as const;

export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTERS)[number];

export type InventoryStatus = (typeof INVENTORY_STATUS)[keyof typeof INVENTORY_STATUS];

export const STOCK_LEDGER_TYPE = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  RESERVE: 'reserve',
  RELEASE: 'release',
  COMMIT: 'commit',
  ADJUST: 'adjust',
  DAMAGE: 'damage',
  RETURN: 'return',
} as const;

export type StockLedgerType = (typeof STOCK_LEDGER_TYPE)[keyof typeof STOCK_LEDGER_TYPE];
