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

function normalizeInventoryItem(raw: unknown): InventoryItemRow {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    productId: String(record.productId ?? ''),
    variantId: record.variantId ? String(record.variantId) : undefined,
    warehouseId: String(record.warehouseId ?? ''),
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

export const inventoryApi = {
  async listItems(
    params?: ListQueryParams & {
      warehouseId?: string;
      productId?: string;
      variantId?: string;
      lowStockOnly?: boolean;
    },
  ): Promise<PaginatedResult<InventoryItemRow>> {
    const result = await http.getPaginated<unknown>('/inventory/items', {
      params: {
        ...params,
        lowStockOnly: params?.lowStockOnly ? 'true' : undefined,
      },
    });
    return { ...result, data: normalizeList(result.data, normalizeInventoryItem) };
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
