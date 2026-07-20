import { Types } from 'mongoose';
import {
  InventoryItemModel,
  StockMovementModel,
  InventoryAlertModel,
  WarehouseModel,
  type InventoryItemDocument,
} from '@/models/inventory.models';
import { ProductVariantModel } from '@/models/product.models';
import {
  inventoryRepository,
  type InventoryListFilters,
} from '@/repositories/inventory.repository';
import { writeAuditLog, writeActivityLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import {
  assertNonNegative,
  computeAvailable,
  deriveStockStatus,
  snapshotBalance,
} from '@/utils/stock.helper';
import {
  ALERT_TYPE,
  ALERT_STATUS,
  INVENTORY_AUDIT,
  MOVEMENT_TYPE,
  type MovementType,
} from '@/constants/inventory';

export interface ApplyMovementInput {
  warehouseId: string;
  variantId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string;
  referenceId?: string | null;
  reason?: string | null;
  note?: string | null;
  /** Skip alert emission (internal). */
  silent?: boolean;
}

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

export class InventoryService {
  async list(options: InventoryListFilters) {
    return inventoryRepository.listInventory(options);
  }

  async getById(id: string) {
    const item = await InventoryItemModel.findOne({ _id: id, isDeleted: false })
      .populate('warehouseId', 'name code')
      .populate('variantId', 'sku title price');
    if (!item) throw ApiError.notFound('Inventory item not found');
    return item;
  }

  async getByWarehouseVariant(warehouseId: string, variantId: string) {
    const item = await inventoryRepository.findByWarehouseVariant(warehouseId, variantId);
    if (!item) throw ApiError.notFound('Inventory item not found');
    return item;
  }

  async ensureWarehouse(warehouseId: string) {
    const wh = await WarehouseModel.findOne({
      _id: warehouseId,
      isDeleted: false,
      status: 'active',
    });
    if (!wh) throw ApiError.notFound('Warehouse not found or inactive');
    return wh;
  }

  async ensureVariant(variantId: string) {
    const variant = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!variant) throw ApiError.notFound('Product variant not found');
    return variant;
  }

  async getOrCreateItem(
    warehouseId: string,
    variantId: string,
    extras?: { unitCost?: number; reorderPoint?: number; safetyStock?: number },
  ): Promise<InventoryItemDocument> {
    await this.ensureWarehouse(warehouseId);
    const variant = await this.ensureVariant(variantId);

    let item = await inventoryRepository.findByWarehouseVariant(warehouseId, variantId);
    if (item) return item;

    item = await InventoryItemModel.create({
      warehouseId,
      variantId,
      productId: variant.productId,
      sku: variant.sku,
      available: 0,
      reserved: 0,
      incoming: 0,
      damaged: 0,
      returned: 0,
      onHand: 0,
      safetyStock: extras?.safetyStock ?? 0,
      reorderPoint: extras?.reorderPoint ?? 0,
      maximumStock: 0,
      unitCost: extras?.unitCost ?? 0,
      currency: variant.currency ?? 'LKR',
      stockStatus: deriveStockStatus(0, extras?.reorderPoint ?? 0, extras?.safetyStock ?? 0),
      version: 1,
    });

    return item;
  }

  async createItem(payload: Record<string, unknown>, actor: ActorMeta) {
    const warehouseId = String(payload.warehouseId);
    const variantId = String(payload.variantId);
    const existing = await inventoryRepository.findByWarehouseVariant(warehouseId, variantId);
    if (existing) {
      throw ApiError.conflict('Inventory already exists for this variant and warehouse');
    }

    const onHand = Number(payload.onHand ?? 0);
    const reserved = Number(payload.reserved ?? 0);
    const damaged = Number(payload.damaged ?? 0);
    const available = computeAvailable(onHand, reserved, damaged);

    if (onHand < 0 || reserved < 0 || damaged < 0 || available < 0) {
      throw ApiError.badRequest('Stock values cannot be negative', undefined, 'NEGATIVE_STOCK');
    }

    const variant = await this.ensureVariant(variantId);
    await this.ensureWarehouse(warehouseId);

    const reorderPoint = Number(payload.reorderPoint ?? 0);
    const safetyStock = Number(payload.safetyStock ?? 0);

    const item = await InventoryItemModel.create({
      warehouseId,
      variantId,
      productId: variant.productId,
      sku: variant.sku,
      onHand,
      reserved,
      damaged,
      available,
      incoming: Number(payload.incoming ?? 0),
      returned: Number(payload.returned ?? 0),
      safetyStock,
      reorderPoint,
      maximumStock: Number(payload.maximumStock ?? 0),
      unitCost: Number(payload.unitCost ?? 0),
      currency: payload.currency ?? variant.currency ?? 'LKR',
      stockStatus: deriveStockStatus(available, reorderPoint, safetyStock),
      version: 1,
    });

    if (onHand > 0) {
      await this.writeLedger({
        item,
        type: MOVEMENT_TYPE.RECEIVE,
        quantity: onHand,
        actor,
        note: 'Initial stock',
        referenceType: 'manual',
      });
    }

    await writeAuditLog({
      action: INVENTORY_AUDIT.STOCK_CHANGE,
      resourceType: 'inventory_items',
      resourceId: item._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(item),
    });

    return item;
  }

  async updateItem(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await this.getById(id);
    const allowed = [
      'safetyStock',
      'reorderPoint',
      'maximumStock',
      'unitCost',
      'currency',
      'sku',
    ] as const;

    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (payload[key] !== undefined) $set[key] = payload[key];
    }

    if (Object.keys($set).length === 0) {
      throw ApiError.badRequest('No updatable fields provided');
    }

    const reorderPoint = Number($set.reorderPoint ?? before.reorderPoint);
    const safetyStock = Number($set.safetyStock ?? before.safetyStock);
    $set.stockStatus = deriveStockStatus(before.available, reorderPoint, safetyStock);
    $set.version = before.version + 1;

    const item = await InventoryItemModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set },
      { new: true },
    );

    await writeAuditLog({
      action: INVENTORY_AUDIT.STOCK_CHANGE,
      resourceType: 'inventory_items',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before as never),
      after: item ? (item.toObject() as unknown as Record<string, unknown>) : null,
    });

    return item;
  }

  /**
   * Core stock mutation engine. Orders (later) should only call this API surface.
   */
  async applyMovement(input: ApplyMovementInput, actor: ActorMeta) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw ApiError.badRequest('Quantity must be a positive integer');
    }

    const item = await this.getOrCreateItem(input.warehouseId, input.variantId);
    const next = {
      onHand: item.onHand,
      available: item.available,
      reserved: item.reserved,
      incoming: item.incoming,
      damaged: item.damaged,
      returned: item.returned,
    };

    switch (input.type) {
      case MOVEMENT_TYPE.RECEIVE:
      case MOVEMENT_TYPE.TRANSFER_IN:
      case MOVEMENT_TYPE.RETURN:
        next.onHand += input.quantity;
        if (input.type === MOVEMENT_TYPE.RETURN) next.returned += input.quantity;
        if (input.type === MOVEMENT_TYPE.RECEIVE && item.incoming >= input.quantity) {
          next.incoming -= input.quantity;
        }
        break;

      case MOVEMENT_TYPE.RESERVE:
        if (item.available < input.quantity) {
          await this.raiseAlert({
            type: ALERT_TYPE.NEGATIVE_ATTEMPT,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            inventoryItemId: item._id.toString(),
            message: `Reservation of ${input.quantity} exceeds available ${item.available}`,
            metadata: { attempted: input.quantity, available: item.available },
          });
          throw ApiError.unprocessable(
            'Reservation cannot exceed available stock',
            { available: item.available, requested: input.quantity },
            'INSUFFICIENT_AVAILABLE',
          );
        }
        next.reserved += input.quantity;
        break;

      case MOVEMENT_TYPE.RELEASE:
        if (item.reserved < input.quantity) {
          throw ApiError.unprocessable(
            'Cannot release more than reserved',
            { reserved: item.reserved, requested: input.quantity },
            'INSUFFICIENT_RESERVED',
          );
        }
        next.reserved -= input.quantity;
        break;

      case MOVEMENT_TYPE.COMMIT:
        if (item.reserved < input.quantity) {
          throw ApiError.unprocessable(
            'Commit must reduce reserved stock; insufficient reserved',
            { reserved: item.reserved, requested: input.quantity },
            'INSUFFICIENT_RESERVED',
          );
        }
        if (item.onHand < input.quantity) {
          await this.raiseAlert({
            type: ALERT_TYPE.NEGATIVE_ATTEMPT,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            inventoryItemId: item._id.toString(),
            message: `Commit of ${input.quantity} would make onHand negative`,
          });
          throw ApiError.unprocessable('Stock cannot become negative', undefined, 'NEGATIVE_STOCK');
        }
        next.reserved -= input.quantity;
        next.onHand -= input.quantity;
        break;

      case MOVEMENT_TYPE.TRANSFER_OUT:
        if (item.available < input.quantity) {
          await this.raiseAlert({
            type: ALERT_TYPE.NEGATIVE_ATTEMPT,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            inventoryItemId: item._id.toString(),
            message: `Transfer out of ${input.quantity} exceeds available ${item.available}`,
          });
          throw ApiError.unprocessable(
            'Insufficient available stock for transfer out',
            { available: item.available, requested: input.quantity },
            'INSUFFICIENT_AVAILABLE',
          );
        }
        next.onHand -= input.quantity;
        break;

      case MOVEMENT_TYPE.DAMAGE:
        if (item.available < input.quantity) {
          throw ApiError.unprocessable(
            'Insufficient available stock to mark damaged',
            { available: item.available, requested: input.quantity },
            'INSUFFICIENT_AVAILABLE',
          );
        }
        next.damaged += input.quantity;
        break;

      case MOVEMENT_TYPE.ADJUSTMENT:
      case MOVEMENT_TYPE.MANUAL_CORRECTION: {
        // quantity is absolute delta via signed intent: use note convention
        // API passes `direction: increase|decrease` via reason prefix or we accept signed delta in `note`
        // Here we treat quantity as absolute and reason starts with decrease|increase
        const direction =
          input.reason?.startsWith('decrease') || input.note?.includes('decrease')
            ? 'decrease'
            : 'increase';
        if (direction === 'decrease') {
          if (item.available < input.quantity) {
            await this.raiseAlert({
              type: ALERT_TYPE.NEGATIVE_ATTEMPT,
              warehouseId: input.warehouseId,
              variantId: input.variantId,
              inventoryItemId: item._id.toString(),
              message: `Adjustment decrease of ${input.quantity} exceeds available`,
            });
            throw ApiError.unprocessable(
              'Stock cannot become negative',
              undefined,
              'NEGATIVE_STOCK',
            );
          }
          next.onHand -= input.quantity;
        } else {
          next.onHand += input.quantity;
        }
        break;
      }

      default:
        throw ApiError.badRequest(`Unsupported movement type: ${input.type}`);
    }

    next.available = computeAvailable(next.onHand, next.reserved, next.damaged);

    try {
      assertNonNegative(next, input.type);
    } catch {
      await this.raiseAlert({
        type: ALERT_TYPE.NEGATIVE_ATTEMPT,
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        inventoryItemId: item._id.toString(),
        message: `Negative stock attempt via ${input.type}`,
        metadata: { next },
      });
      throw ApiError.unprocessable('Stock cannot become negative', next, 'NEGATIVE_STOCK');
    }

    const stockStatus = deriveStockStatus(next.available, item.reorderPoint, item.safetyStock);

    const updated = await InventoryItemModel.findOneAndUpdate(
      { _id: item._id, version: item.version, isDeleted: false },
      {
        $set: {
          ...next,
          stockStatus,
          ...(input.unitCost != null ? { unitCost: input.unitCost } : {}),
          version: item.version + 1,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw ApiError.conflict(
        'Inventory was modified concurrently; retry the operation',
        undefined,
        'VERSION_CONFLICT',
      );
    }

    const movement = await this.writeLedger({
      item: updated,
      type: input.type,
      quantity: input.quantity,
      actor,
      unitCost: input.unitCost,
      referenceType: input.referenceType ?? 'manual',
      referenceId: input.referenceId,
      reason: input.reason,
      note: input.note,
    });

    await writeAuditLog({
      action:
        input.type === MOVEMENT_TYPE.ADJUSTMENT || input.type === MOVEMENT_TYPE.MANUAL_CORRECTION
          ? INVENTORY_AUDIT.ADJUSTMENT
          : INVENTORY_AUDIT.STOCK_CHANGE,
      resourceType: 'inventory_items',
      resourceId: updated._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: snapshotBalance(item) as unknown as Record<string, unknown>,
      after: snapshotBalance(updated) as unknown as Record<string, unknown>,
      metadata: {
        type: input.type,
        quantity: input.quantity,
        movementId: movement._id.toString(),
      },
    });

    if (!input.silent) {
      await this.evaluateStockAlerts(updated);
    }

    return { item: updated, movement };
  }

  async adjust(
    payload: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      direction: 'increase' | 'decrease';
      reason?: string;
      note?: string;
      unitCost?: number;
    },
    actor: ActorMeta,
  ) {
    return this.applyMovement(
      {
        warehouseId: payload.warehouseId,
        variantId: payload.variantId,
        type: MOVEMENT_TYPE.ADJUSTMENT,
        quantity: payload.quantity,
        reason: `${payload.direction}:${payload.reason ?? 'adjustment'}`,
        note: payload.note ?? payload.direction,
        unitCost: payload.unitCost,
        referenceType: 'adjustment',
      },
      actor,
    );
  }

  /** Get or create the default store warehouse (hidden from simple product stock UI). */
  async ensureDefaultWarehouse() {
    const existing = await WarehouseModel.findOne({
      isDeleted: false,
      status: 'active',
      isDefault: true,
    });
    if (existing) return existing;

    const anyActive = await WarehouseModel.findOne({ isDeleted: false, status: 'active' }).sort({
      priority: 1,
      createdAt: 1,
    });
    if (anyActive) {
      if (!anyActive.isDefault) {
        await WarehouseModel.updateMany({ isDeleted: false }, { $set: { isDefault: false } });
        anyActive.isDefault = true;
        await anyActive.save();
      }
      return anyActive;
    }

    return WarehouseModel.create({
      name: 'Main store',
      code: 'MAIN',
      isDefault: true,
      status: 'active',
      timezone: 'Asia/Colombo',
      priority: 1,
    });
  }

  /**
   * Set absolute on-hand stock for a variant. Uses the default warehouse automatically.
   * If stock exists across warehouses, other locations are left alone and the default
   * warehouse is adjusted so the product total matches the entered quantity when possible.
   */
  async setStockQuantity(payload: { variantId: string; quantity: number }, actor: ActorMeta) {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw ApiError.badRequest('Quantity must be a non-negative integer');
    }

    const warehouse = await this.ensureDefaultWarehouse();
    const warehouseId = warehouse._id.toString();
    const variantId = String(payload.variantId);

    const items = await InventoryItemModel.find({
      variantId,
      isDeleted: false,
    });

    const othersOnHand = items
      .filter((item) => item.warehouseId.toString() !== warehouseId)
      .reduce((sum, item) => sum + item.onHand, 0);

    if (othersOnHand > quantity) {
      throw ApiError.unprocessable(
        `Cannot set stock to ${quantity}: ${othersOnHand} units are already held in other locations`,
        { othersOnHand, requested: quantity },
        'INSUFFICIENT_AVAILABLE',
      );
    }

    const targetOnDefault = quantity - othersOnHand;
    const item = await this.getOrCreateItem(warehouseId, variantId);
    const current = item.onHand;

    if (targetOnDefault === current) {
      return { item, movement: null };
    }

    if (targetOnDefault > current) {
      return this.applyMovement(
        {
          warehouseId,
          variantId,
          type: MOVEMENT_TYPE.ADJUSTMENT,
          quantity: targetOnDefault - current,
          reason: 'increase:set-stock',
          note: 'Set stock quantity',
          referenceType: 'adjustment',
        },
        actor,
      );
    }

    const decreaseBy = current - targetOnDefault;
    if (item.available < decreaseBy) {
      throw ApiError.unprocessable(
        `Cannot set stock to ${quantity}: ${item.reserved} units are reserved`,
        { onHand: current, reserved: item.reserved, available: item.available },
        'INSUFFICIENT_AVAILABLE',
      );
    }

    return this.applyMovement(
      {
        warehouseId,
        variantId,
        type: MOVEMENT_TYPE.ADJUSTMENT,
        quantity: decreaseBy,
        reason: 'decrease:set-stock',
        note: 'Set stock quantity',
        referenceType: 'adjustment',
      },
      actor,
    );
  }

  async receive(
    payload: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      unitCost?: number;
      referenceType?: string;
      referenceId?: string;
      note?: string;
    },
    actor: ActorMeta,
  ) {
    return this.applyMovement(
      {
        ...payload,
        type: MOVEMENT_TYPE.RECEIVE,
        referenceType: payload.referenceType ?? 'receiving',
      },
      actor,
    );
  }

  async markDamaged(
    payload: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      reason?: string;
      note?: string;
    },
    actor: ActorMeta,
  ) {
    return this.applyMovement(
      {
        ...payload,
        type: MOVEMENT_TYPE.DAMAGE,
        referenceType: 'damage',
      },
      actor,
    );
  }

  async returnToInventory(
    payload: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      reason?: string;
      note?: string;
      referenceId?: string;
    },
    actor: ActorMeta,
  ) {
    return this.applyMovement(
      {
        ...payload,
        type: MOVEMENT_TYPE.RETURN,
        referenceType: 'return',
      },
      actor,
    );
  }

  async addIncoming(warehouseId: string, variantId: string, quantity: number, actor: ActorMeta) {
    const item = await this.getOrCreateItem(warehouseId, variantId);
    const updated = await InventoryItemModel.findOneAndUpdate(
      { _id: item._id, version: item.version, isDeleted: false },
      {
        $inc: { incoming: quantity, version: 1 },
      },
      { new: true },
    );
    if (!updated) throw ApiError.conflict('Inventory conflict', undefined, 'VERSION_CONFLICT');

    await writeAuditLog({
      action: INVENTORY_AUDIT.STOCK_CHANGE,
      resourceType: 'inventory_items',
      resourceId: updated._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { incomingDelta: quantity },
      after: snapshotBalance(updated) as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async listHistory(options: Parameters<typeof inventoryRepository.listMovements>[0]) {
    return inventoryRepository.listMovements(options);
  }

  async exportAll(options: InventoryListFilters) {
    return inventoryRepository.listInventory({ ...options, page: 1, limit: 100 });
  }

  async importPlaceholder(actor: ActorMeta) {
    await writeAuditLog({
      action: 'inventory.import_placeholder',
      resourceType: 'inventory_items',
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { status: 'not_implemented' },
    });
    return {
      accepted: false,
      message: 'Inventory import pipeline is stubbed for a later phase.',
      supportedFormats: ['csv', 'xlsx'],
    };
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: Record<string, unknown> }>,
    actor: ActorMeta,
  ) {
    const items = [];
    for (const row of updates) {
      items.push(await this.updateItem(row.id, row.data, actor));
    }
    return { count: items.length, items };
  }

  async bulkDelete(ids: string[], actor: ActorMeta) {
    const result = await InventoryItemModel.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
    await writeAuditLog({
      action: 'inventory.bulk_delete',
      resourceType: 'inventory_items',
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { ids, count: result.modifiedCount },
    });
    return { count: result.modifiedCount };
  }

  private async writeLedger(args: {
    item: InventoryItemDocument;
    type: MovementType;
    quantity: number;
    actor: ActorMeta;
    unitCost?: number | null;
    referenceType?: string;
    referenceId?: string | null;
    reason?: string | null;
    note?: string | null;
  }) {
    return StockMovementModel.create({
      warehouseId: args.item.warehouseId,
      variantId: args.item.variantId,
      productId: args.item.productId,
      inventoryItemId: args.item._id,
      type: args.type,
      quantity: args.quantity,
      balanceAfter: snapshotBalance(args.item),
      unitCost: args.unitCost ?? args.item.unitCost,
      referenceType: args.referenceType ?? 'manual',
      referenceId: args.referenceId ? new Types.ObjectId(args.referenceId) : null,
      reason: args.reason ?? null,
      note: args.note ?? null,
      createdBy: args.actor.userId ?? null,
    });
  }

  async raiseAlert(input: {
    type: string;
    warehouseId?: string;
    variantId?: string;
    inventoryItemId?: string;
    reservationId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return InventoryAlertModel.create({
      type: input.type,
      status: ALERT_STATUS.OPEN,
      warehouseId: input.warehouseId ?? null,
      variantId: input.variantId ?? null,
      inventoryItemId: input.inventoryItemId ?? null,
      reservationId: input.reservationId ?? null,
      message: input.message,
      metadata: input.metadata ?? {},
    });
  }

  async evaluateStockAlerts(item: InventoryItemDocument) {
    if (item.available <= 0) {
      await this.raiseAlert({
        type: ALERT_TYPE.OUT_OF_STOCK,
        warehouseId: item.warehouseId.toString(),
        variantId: item.variantId.toString(),
        inventoryItemId: item._id.toString(),
        message: `Variant ${item.sku ?? item.variantId} is out of stock`,
      });
      return;
    }

    const threshold = Math.max(item.reorderPoint, item.safetyStock);
    if (threshold > 0 && item.available <= threshold) {
      await this.raiseAlert({
        type: item.available <= item.reorderPoint ? ALERT_TYPE.REORDER : ALERT_TYPE.LOW_STOCK,
        warehouseId: item.warehouseId.toString(),
        variantId: item.variantId.toString(),
        inventoryItemId: item._id.toString(),
        message: `Low stock for ${item.sku ?? item.variantId}: available=${item.available}, threshold=${threshold}`,
        metadata: { available: item.available, reorderPoint: item.reorderPoint },
      });
    }
  }
}

export const inventoryService = new InventoryService();
