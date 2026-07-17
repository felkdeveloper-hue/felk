import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { BaseRepository, type ListOptions } from '@/repositories/base.repository';
import {
  InventoryItemModel,
  StockMovementModel,
  type InventoryItemDocument,
} from '@/models/inventory.models';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { parseSort } from '@/utils/sorting';

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
      filter.$expr = { $lte: ['$available', { $max: ['$reorderPoint', '$safetyStock'] }] };
      filter.available = { $gt: 0 };
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

    const [data, total] = await Promise.all([
      InventoryItemModel.find(filter as FilterQuery<InventoryItemDocument>)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('warehouseId', 'name code')
        .populate('variantId', 'sku title price')
        .lean(),
      InventoryItemModel.countDocuments(filter as FilterQuery<InventoryItemDocument>),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
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
