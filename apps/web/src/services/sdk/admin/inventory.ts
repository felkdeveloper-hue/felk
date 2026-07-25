import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface InventoryItemRow {
  id: string;
  productId: string;
  variantId?: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  sku?: string;
}

/** Extract a string ID from either a raw ObjectId/string or a populated Mongoose sub-document. */
function extractId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // populated Mongoose document exposes _id or id
    const raw = obj._id ?? obj.id;
    if (raw) return String(raw);
  }
  return String(value);
}

function normalizeInventoryItem(raw: unknown): InventoryItemRow {
  const record = raw as Record<string, unknown>;
  const variantId = extractId(record.variantId);
  return {
    id: normalizeId(record),
    productId: extractId(record.productId),
    variantId: variantId || undefined,
    warehouseId: extractId(record.warehouseId),
    quantityOnHand: Number(
      record.quantityOnHand ?? record.onHand ?? record.available ?? record.quantityAvailable ?? 0,
    ),
    quantityReserved: Number(record.quantityReserved ?? record.reserved ?? 0),
    quantityAvailable: Number(
      record.quantityAvailable ??
        record.available ??
        Number(record.quantityOnHand ?? record.onHand ?? 0) -
          Number(record.quantityReserved ?? record.reserved ?? 0),
    ),
    sku: typeof record.sku === 'string' ? record.sku : undefined,
  };
}

export interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export interface StockAdjustInput {
  warehouseId: string;
  variantId: string;
  quantity: number;
  direction: 'increase' | 'decrease';
  reason?: string;
}

export interface InventoryItemCreateInput {
  warehouseId: string;
  variantId: string;
  onHand?: number;
}

export interface SetStockInput {
  variantId: string;
  quantity: number;
}

export type InventoryListFilters = ListQueryParams & {
  warehouseId?: string;
  productId?: string;
  variantId?: string;
  lowStockOnly?: boolean;
};

/** `/inventory/items` rejects any `limit` above 100 with a 400. */
const ITEMS_MAX_PAGE_SIZE = 100;
const ITEMS_MAX_PAGES = 20;

export const inventoryApi = {
  async listItems(params?: InventoryListFilters): Promise<PaginatedResult<InventoryItemRow>> {
    const result = await http.getPaginated<unknown>('/inventory/items', {
      params: {
        ...params,
        lowStockOnly: params?.lowStockOnly ? 'true' : undefined,
      },
    });
    return { ...result, data: normalizeList(result.data, normalizeInventoryItem) };
  },

  /**
   * Every matching row, walking pages so a product with many colour/size
   * variants still reports complete stock.
   */
  async listAllItems(params?: InventoryListFilters): Promise<InventoryItemRow[]> {
    const rows: InventoryItemRow[] = [];
    for (let page = 1; page <= ITEMS_MAX_PAGES; page += 1) {
      const result = await inventoryApi.listItems({
        ...params,
        page,
        limit: ITEMS_MAX_PAGE_SIZE,
      });
      rows.push(...result.data);
      const totalPages = Number(result.meta?.totalPages ?? 1);
      if (!result.data.length || page >= totalPages) break;
    }
    return rows;
  },

  async listWarehouses(): Promise<WarehouseRow[]> {
    const rows = await http.get<unknown[]>('/inventory/warehouses');
    return normalizeList(rows, (raw) => {
      const record = raw as Record<string, unknown>;
      return {
        id: normalizeId(record),
        name: String(record.name ?? ''),
        code: String(record.code ?? ''),
        isActive: record.isActive !== false,
      };
    });
  },

  async listAlerts(): Promise<unknown[]> {
    return http.get<unknown[]>('/inventory/alerts');
  },

  async createItem(payload: InventoryItemCreateInput): Promise<InventoryItemRow> {
    return normalizeInventoryItem(await http.post<unknown>('/inventory/items', payload));
  },

  async adjust(payload: StockAdjustInput): Promise<unknown> {
    return http.post('/inventory/adjustments', payload);
  },

  async setStock(payload: SetStockInput): Promise<unknown> {
    return http.post('/inventory/set-stock', payload);
  },
};
