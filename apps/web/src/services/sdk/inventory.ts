import { http } from '@/lib/http-client';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface InventoryItem {
  id: string;
  productId: string;
  variantId?: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  [key: string]: unknown;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface StockReservation {
  id: string;
  inventoryItemId: string;
  quantity: number;
  status: 'active' | 'released' | 'committed' | string;
  expiresAt?: string;
}

export interface InventoryListParams extends ListQueryParams {
  warehouseId?: string;
  productId?: string;
}

/**
 * Typed SDK for `/inventory/*`. Mostly consumed by staff surfaces, but kept
 * here so storefront features (e.g. low-stock badges, availability checks)
 * have a single typed entry point instead of ad-hoc axios calls.
 */
export const inventoryApi = {
  listItems(params?: InventoryListParams): Promise<PaginatedResult<InventoryItem>> {
    return http.getPaginated<InventoryItem>('/inventory/items', { params });
  },

  getItemById(id: string): Promise<InventoryItem> {
    return http.get<InventoryItem>(`/inventory/items/${id}`);
  },

  listWarehouses(params?: ListQueryParams): Promise<PaginatedResult<Warehouse>> {
    return http.getPaginated<Warehouse>('/inventory/warehouses', { params });
  },

  getWarehouseById(id: string): Promise<Warehouse> {
    return http.get<Warehouse>(`/inventory/warehouses/${id}`);
  },

  listReservations(params?: ListQueryParams): Promise<PaginatedResult<StockReservation>> {
    return http.getPaginated<StockReservation>('/inventory/reservations', { params });
  },

  reserveStock(payload: {
    inventoryItemId: string;
    quantity: number;
    referenceId?: string;
  }): Promise<StockReservation> {
    return http.post<StockReservation>('/inventory/reservations', payload);
  },

  releaseReservation(id: string): Promise<StockReservation> {
    return http.post<StockReservation>(`/inventory/reservations/${id}/release`);
  },
};
