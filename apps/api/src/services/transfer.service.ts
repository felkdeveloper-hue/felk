import { StockTransferModel } from '@/models/inventory.models';
import { ProductVariantModel } from '@/models/product.models';
import { inventoryService } from '@/services/inventory.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import {
  INVENTORY_AUDIT,
  MOVEMENT_TYPE,
  TRANSFER_STATUS,
  type TransferStatus,
} from '@/constants/inventory';

const FLOW: TransferStatus[] = [
  TRANSFER_STATUS.REQUESTED,
  TRANSFER_STATUS.APPROVED,
  TRANSFER_STATUS.PACKED,
  TRANSFER_STATUS.SHIPPED,
  TRANSFER_STATUS.RECEIVED,
];

export class TransferService {
  async list(options: {
    page?: number;
    limit?: number;
    status?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    q?: string;
  }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };
    if (options.status) filter.status = options.status;
    if (options.fromWarehouseId) filter.fromWarehouseId = options.fromWarehouseId;
    if (options.toWarehouseId) filter.toWarehouseId = options.toWarehouseId;
    if (options.q) {
      filter.transferNumber = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      StockTransferModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromWarehouseId', 'name code')
        .populate('toWarehouseId', 'name code')
        .lean(),
      StockTransferModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const doc = await StockTransferModel.findOne({ _id: id, isDeleted: false })
      .populate('fromWarehouseId', 'name code')
      .populate('toWarehouseId', 'name code');
    if (!doc) throw ApiError.notFound('Transfer not found');
    return doc;
  }

  private async getMutable(id: string) {
    const doc = await StockTransferModel.findOne({ _id: id, isDeleted: false });
    if (!doc) throw ApiError.notFound('Transfer not found');
    return doc;
  }

  async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const fromWarehouseId = String(payload.fromWarehouseId);
    const toWarehouseId = String(payload.toWarehouseId);
    if (fromWarehouseId === toWarehouseId) {
      throw ApiError.badRequest('Source and destination warehouses must differ');
    }

    await inventoryService.ensureWarehouse(fromWarehouseId);
    await inventoryService.ensureWarehouse(toWarehouseId);

    const rawItems = (payload.items as Array<Record<string, unknown>>) ?? [];
    if (!rawItems.length) throw ApiError.badRequest('Transfer must include items');

    const items = [];
    for (const row of rawItems) {
      const variant = await ProductVariantModel.findOne({
        _id: row.variantId,
        isDeleted: false,
      });
      if (!variant) throw ApiError.badRequest(`Variant not found: ${row.variantId}`);
      items.push({
        variantId: variant._id,
        productId: variant.productId,
        sku: variant.sku,
        quantity: Number(row.quantity),
        quantityReceived: 0,
      });
    }

    const transferNumber =
      (payload.transferNumber as string | undefined)?.toUpperCase() ??
      `TR-${Date.now().toString(36).toUpperCase()}`;

    const existing = await StockTransferModel.findOne({
      transferNumber,
      isDeleted: false,
    });
    if (existing) throw ApiError.conflict('Transfer number already exists');

    const transfer = await StockTransferModel.create({
      transferNumber,
      fromWarehouseId,
      toWarehouseId,
      status: TRANSFER_STATUS.REQUESTED,
      items,
      notes: payload.notes ?? null,
      requestedBy: actor.userId ?? null,
    });

    await writeAuditLog({
      action: INVENTORY_AUDIT.TRANSFER,
      resourceType: 'stock_transfers',
      resourceId: transfer._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: transfer.toObject() as Record<string, unknown>,
      metadata: { op: 'create' },
    });

    return transfer;
  }

  private assertTransition(current: string, next: TransferStatus) {
    if (current === TRANSFER_STATUS.CANCELLED || current === TRANSFER_STATUS.RECEIVED) {
      throw ApiError.badRequest(`Transfer already ${current}`);
    }
    const currentIdx = FLOW.indexOf(current as TransferStatus);
    const nextIdx = FLOW.indexOf(next);
    if (nextIdx !== currentIdx + 1) {
      throw ApiError.badRequest(`Invalid transition ${current} → ${next}`);
    }
  }

  async approve(id: string, actor: ActorMeta) {
    const transfer = await this.getMutable(id);
    this.assertTransition(transfer.status, TRANSFER_STATUS.APPROVED);
    transfer.status = TRANSFER_STATUS.APPROVED;
    transfer.approvedBy = actor.userId as never;
    transfer.approvedAt = new Date();
    await transfer.save();
    await this.audit(transfer, actor, 'approve');
    return this.getById(id);
  }

  async pack(id: string, actor: ActorMeta) {
    const transfer = await this.getMutable(id);
    this.assertTransition(transfer.status, TRANSFER_STATUS.PACKED);
    transfer.status = TRANSFER_STATUS.PACKED;
    transfer.packedAt = new Date();
    await transfer.save();
    await this.audit(transfer, actor, 'pack');
    return this.getById(id);
  }

  async ship(id: string, actor: ActorMeta) {
    const transfer = await this.getMutable(id);
    this.assertTransition(transfer.status, TRANSFER_STATUS.SHIPPED);

    for (const item of transfer.items) {
      await inventoryService.applyMovement(
        {
          warehouseId: transfer.fromWarehouseId.toString(),
          variantId: item.variantId.toString(),
          type: MOVEMENT_TYPE.TRANSFER_OUT,
          quantity: item.quantity,
          referenceType: 'transfer',
          referenceId: transfer._id.toString(),
          note: `Transfer ${transfer.transferNumber} shipped`,
        },
        actor,
      );
    }

    transfer.status = TRANSFER_STATUS.SHIPPED;
    transfer.shippedAt = new Date();
    await transfer.save();
    await this.audit(transfer, actor, 'ship');
    return this.getById(id);
  }

  async receive(id: string, actor: ActorMeta) {
    const transfer = await this.getMutable(id);
    this.assertTransition(transfer.status, TRANSFER_STATUS.RECEIVED);

    for (const item of transfer.items) {
      await inventoryService.applyMovement(
        {
          warehouseId: transfer.toWarehouseId.toString(),
          variantId: item.variantId.toString(),
          type: MOVEMENT_TYPE.TRANSFER_IN,
          quantity: item.quantity,
          referenceType: 'transfer',
          referenceId: transfer._id.toString(),
          note: `Transfer ${transfer.transferNumber} received`,
        },
        actor,
      );
      item.quantityReceived = item.quantity;
    }

    transfer.status = TRANSFER_STATUS.RECEIVED;
    transfer.receivedAt = new Date();
    await transfer.save();
    await this.audit(transfer, actor, 'receive');
    return this.getById(id);
  }

  async cancel(id: string, actor: ActorMeta) {
    const transfer = await this.getMutable(id);
    if (
      [TRANSFER_STATUS.SHIPPED, TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED].includes(
        transfer.status as never,
      )
    ) {
      throw ApiError.badRequest(`Cannot cancel transfer in status ${transfer.status}`);
    }

    transfer.status = TRANSFER_STATUS.CANCELLED;
    transfer.cancelledAt = new Date();
    await transfer.save();
    await this.audit(transfer, actor, 'cancel');
    return this.getById(id);
  }

  private async audit(
    transfer: { _id: { toString(): string }; toObject: () => Record<string, unknown> },
    actor: ActorMeta,
    op: string,
  ) {
    await writeAuditLog({
      action: INVENTORY_AUDIT.TRANSFER,
      resourceType: 'stock_transfers',
      resourceId: transfer._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: transfer.toObject(),
      metadata: { op },
    });
  }
}

export const transferService = new TransferService();
