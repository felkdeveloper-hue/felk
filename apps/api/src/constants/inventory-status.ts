export const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  BACKORDER: 'backorder',
} as const;

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
