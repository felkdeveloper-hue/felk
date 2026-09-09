import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { BaseRepository, type ListOptions } from '@/repositories/base.repository.js';
import {
  InventoryItemModel,
  StockMovementModel,
  type InventoryItemDocument,
} from '@/models/inventory.models.js';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  type ProductStockFilter,
} from '@/constants/inventory-status.js';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination.js';
import { parseSort } from '@/utils/sorting.js';

/** Variant still sellable but below 2 units (i.e. exactly 1). */
const lowStockVariantExpr = {
  $and: [{ $gt: ['$available', 0] }, { $lt: ['$available', 2] }],
} as const;

export interface InventoryListFilters extends ListOptions {
  warehouseId?: string;
  variantId?: string;
  productId?: string;
  sku?: string;
  stockStatus?: string;
  lowStockOnly?: boolean;
  minAvailable?: number;
  maxAvailable?: number;
}

export class InventoryRepository extends BaseRepository {
  constructor() {
    super(
      InventoryItemModel,
      ['sku'],
      ['createdAt', 'updatedAt', 'available', 'reserved', 'onHand', 'sku', 'stockStatus'],
    );
  }

  async findByWarehouseVariant(warehouseId: string, variantId: string) {
    return InventoryItemModel.findOne({
      warehouseId,
      variantId,
      isDeleted: false,
    });
  }

  async listInventory(options: InventoryListFilters) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};

    if (!options.includeDeleted) filter.isDeleted = false;
    if (options.status) filter.status = options.status;
    if (options.warehouseId) filter.warehouseId = new Types.ObjectId(options.warehouseId);
    if (options.variantId) filter.variantId = new Types.ObjectId(options.variantId);
    if (options.productId) filter.productId = new Types.ObjectId(options.productId);
    if (options.sku) filter.sku = new RegExp(escapeRegex(options.sku), 'i');
    if (options.stockStatus) filter.stockStatus = options.stockStatus;

    if (options.lowStockOnly) {
      filter.$expr = lowStockVariantExpr;
      filter.available = { $gt: 0, $lt: 2 };
    }

    if (options.minAvailable != null || options.maxAvailable != null) {
      const available: Record<string, number> = {};
      if (options.minAvailable != null) available.$gte = options.minAvailable;
      if (options.maxAvailable != null) available.$lte = options.maxAvailable;
      filter.available = { ...(filter.available as object), ...available };
    }

    if (options.q) {
      const q = options.q.trim();
      filter.$or = [{ sku: new RegExp(escapeRegex(q), 'i') }];
    }

    const sort = parseSort(options, this.sortableFields);
    const skip = getPaginationSkip(page, limit);

    const [raw, total] = await Promise.all([
      InventoryItemModel.find(filter as FilterQuery<InventoryItemDocument>)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('warehouseId', 'name code')
        .populate('variantId', 'sku title price')
        .lean(),
      InventoryItemModel.countDocuments(filter as FilterQuery<InventoryItemDocument>),
    ]);

    // Keep variantId / warehouseId as plain ObjectIds for clients that key by id.
    // Populated docs are exposed separately so admin UIs can still show SKU/title.
    const data = raw.map((row) => {
      const variantPop =
        row.variantId && typeof row.variantId === 'object' && '_id' in row.variantId
          ? (row.variantId as { _id: Types.ObjectId; sku?: string; title?: string; price?: number })
          : null;
      const warehousePop =
        row.warehouseId && typeof row.warehouseId === 'object' && '_id' in row.warehouseId
          ? (row.warehouseId as { _id: Types.ObjectId; name?: string; code?: string })
          : null;
      return {
        ...row,
        variantId: variantPop?._id ?? row.variantId,
        warehouseId: warehousePop?._id ?? row.warehouseId,
        variant: variantPop ?? undefined,
        warehouse: warehousePop ?? undefined,
        // Keep the admin API contract explicit. The database uses the concise
        // field names, while the product editor consumes quantity* aliases.
        quantityOnHand: Number(row.onHand ?? 0),
        quantityReserved: Number(row.reserved ?? 0),
        quantityAvailable: Number(row.available ?? 0),
      };
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async summarizeStock() {
    const [totals] = await InventoryItemModel.aggregate<{
      totalOnHand: number;
      totalAvailable: number;
      totalReserved: number;
      skuCount: number;
    }>([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalOnHand: { $sum: '$onHand' },
          totalAvailable: { $sum: '$available' },
          totalReserved: { $sum: '$reserved' },
          skuCount: { $sum: 1 },
        },
      },
    ]);

    const products = await this.aggregateProductStockFlags();
    const lowStockProducts = products.filter(
      (row) => row.hasLow > 0 && row.hasOut === 0 && row.totalAvailable > 0,
    ).length;
    const outOfStockProducts = products.filter((row) => row.hasOut > 0).length;

    return {
      totalOnHand: Number(totals?.totalOnHand ?? 0),
      totalAvailable: Number(totals?.totalAvailable ?? 0),
      totalReserved: Number(totals?.totalReserved ?? 0),
      skuCount: Number(totals?.skuCount ?? 0),
      outOfStockSkus: outOfStockProducts,
      lowStockSkus: lowStockProducts,
      outOfStockProducts,
      lowStockProducts,
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    };
  }

  async findProductIdsByStockFilter(stockFilter: ProductStockFilter) {
    const rows = await this.aggregateProductStockFlags();

    const inStockIds = rows.filter((row) => row.totalAvailable > 0).map((row) => String(row._id));
    const lowStockIds = rows
      .filter((row) => row.hasLow > 0 && row.hasOut === 0 && row.totalAvailable > 0)
      .map((row) => String(row._id));
    const hasOutIds = rows.filter((row) => row.hasOut > 0).map((row) => String(row._id));
    const outOfStockIds = hasOutIds;

    if (stockFilter === 'in_stock') return { mode: 'in' as const, ids: inStockIds };
    if (stockFilter === 'low_stock') return { mode: 'in' as const, ids: lowStockIds };
    if (stockFilter === 'has_out_variant') return { mode: 'in' as const, ids: hasOutIds };
    return { mode: 'in' as const, ids: outOfStockIds };
  }

  private async aggregateProductStockFlags() {
    return InventoryItemModel.aggregate<{
      _id: Types.ObjectId;
      totalAvailable: number;
      hasLow: number;
      hasOut: number;
    }>([
      { $match: { isDeleted: false, productId: { $ne: null } } },
      {
        $group: {
          _id: '$productId',
          totalAvailable: { $sum: '$available' },
          hasLow: { $max: { $cond: [lowStockVariantExpr, 1, 0] } },
          hasOut: { $max: { $cond: [{ $lte: ['$available', 0] }, 1, 0] } },
        },
      },
    ]);
  }

  async listMovements(
    options: ListOptions & {
      warehouseId?: string;
      variantId?: string;
      type?: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};

    if (options.warehouseId) filter.warehouseId = new Types.ObjectId(options.warehouseId);
    if (options.variantId) filter.variantId = new Types.ObjectId(options.variantId);
    if (options.type) filter.type = options.type;
    if (options.referenceType) filter.referenceType = options.referenceType;
    if (options.referenceId) filter.referenceId = new Types.ObjectId(options.referenceId);

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      StockMovementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StockMovementModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const inventoryRepository = new InventoryRepository();
