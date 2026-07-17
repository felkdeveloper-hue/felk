import { PurchaseOrderModel, SupplierModel } from '@/models/inventory.models';
import { ProductVariantModel } from '@/models/product.models';
import { inventoryService } from '@/services/inventory.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { INVENTORY_AUDIT, PO_STATUS } from '@/constants/inventory';

function computePoTotals(items: Array<{ quantityOrdered: number; unitCost: number }>) {
  const subtotal = items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost, 0);
  return { subtotal, totalCost: subtotal };
}

export class PurchaseOrderService {
  async list(options: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    q?: string;
  }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };
    if (options.status) filter.status = options.status;
    if (options.supplierId) filter.supplierId = options.supplierId;
    if (options.warehouseId) filter.warehouseId = options.warehouseId;
    if (options.q) {
      filter.poNumber = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      PurchaseOrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('supplierId', 'companyName code')
        .populate('warehouseId', 'name code')
        .lean(),
      PurchaseOrderModel.countDocuments(filter),
    ]);

    const enriched = data.map((po) => ({
      ...po,
      items: (po.items as Array<{ quantityOrdered: number; quantityReceived: number }>).map(
        (item) => ({
          ...item,
          quantityOutstanding: Math.max(0, item.quantityOrdered - item.quantityReceived),
        }),
      ),
    }));

    return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false })
      .populate('supplierId', 'companyName code email phone')
      .populate('warehouseId', 'name code');
    if (!po) throw ApiError.notFound('Purchase order not found');

    const plain = po.toObject() as Record<string, unknown>;
    const items = (
      plain.items as Array<{
        quantityOrdered: number;
        quantityReceived: number;
      }>
    ).map((item) => ({
      ...item,
      quantityOutstanding: Math.max(0, item.quantityOrdered - item.quantityReceived),
    }));

    return { ...plain, items };
  }

  async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const supplier = await SupplierModel.findOne({
      _id: payload.supplierId,
      isDeleted: false,
    });
    if (!supplier) throw ApiError.notFound('Supplier not found');

    await inventoryService.ensureWarehouse(String(payload.warehouseId));

    const rawItems = (payload.items as Array<Record<string, unknown>>) ?? [];
    if (!rawItems.length) throw ApiError.badRequest('PO must include items');

    const items = [];
    for (const row of rawItems) {
      const variant = await ProductVariantModel.findOne({
        _id: row.variantId,
        isDeleted: false,
      });
      if (!variant) {
        throw ApiError.badRequest(`Variant not found: ${row.variantId}`);
      }
      const quantityOrdered = Number(row.quantityOrdered);
      const unitCost = Number(row.unitCost ?? 0);
      items.push({
        variantId: variant._id,
        productId: variant.productId,
        sku: variant.sku,
        quantityOrdered,
        quantityReceived: 0,
        unitCost,
        lineTotal: quantityOrdered * unitCost,
      });
    }

    const totals = computePoTotals(items);
    const poNumber =
      (payload.poNumber as string | undefined)?.toUpperCase() ??
      `PO-${Date.now().toString(36).toUpperCase()}`;

    const existing = await PurchaseOrderModel.findOne({ poNumber, isDeleted: false });
    if (existing) throw ApiError.conflict('PO number already exists');

    const po = await PurchaseOrderModel.create({
      poNumber,
      supplierId: payload.supplierId,
      warehouseId: payload.warehouseId,
      expectedDeliveryAt: payload.expectedDeliveryAt ?? null,
      status: payload.status ?? PO_STATUS.DRAFT,
      currency: payload.currency ?? 'LKR',
      notes: payload.notes ?? null,
      items,
      ...totals,
      createdBy: actor.userId ?? null,
    });

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: po._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: po.toObject() as Record<string, unknown>,
      metadata: { op: 'create' },
    });

    return po;
  }

  async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false });
    if (!before) throw ApiError.notFound('Purchase order not found');
    if ([PO_STATUS.RECEIVED, PO_STATUS.CANCELLED].includes(before.status as never)) {
      throw ApiError.badRequest(`Cannot update PO in status ${before.status}`);
    }

    const $set: Record<string, unknown> = {};
    for (const key of ['expectedDeliveryAt', 'notes', 'currency', 'status'] as const) {
      if (payload[key] !== undefined) $set[key] = payload[key];
    }

    const po = await PurchaseOrderModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set },
      { new: true },
    );

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: po?.toObject() as Record<string, unknown>,
      metadata: { op: 'update' },
    });

    return po;
  }

  async placeOrder(id: string, actor: ActorMeta) {
    const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false });
    if (!po) throw ApiError.notFound('Purchase order not found');
    if (po.status !== PO_STATUS.DRAFT) {
      throw ApiError.badRequest('Only draft POs can be ordered');
    }

    for (const item of po.items) {
      await inventoryService.addIncoming(
        po.warehouseId.toString(),
        item.variantId.toString(),
        item.quantityOrdered,
        actor,
      );
    }

    po.status = PO_STATUS.ORDERED;
    po.orderedAt = new Date();
    await po.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: po.toObject() as Record<string, unknown>,
      metadata: { op: 'ordered' },
    });

    return po;
  }

  /** Receive all or partial lines into warehouse stock. */
  async receive(
    id: string,
    lines: Array<{ variantId: string; quantity: number }>,
    actor: ActorMeta,
  ) {
    const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false });
    if (!po) throw ApiError.notFound('Purchase order not found');
    if (![PO_STATUS.ORDERED, PO_STATUS.PARTIAL].includes(po.status as never)) {
      throw ApiError.badRequest('PO must be ordered or partial to receive');
    }

    for (const line of lines) {
      const item = po.items.find((i) => i.variantId.toString() === line.variantId);
      if (!item) throw ApiError.badRequest(`Line not found for variant ${line.variantId}`);

      const outstanding = item.quantityOrdered - item.quantityReceived;
      if (line.quantity > outstanding) {
        throw ApiError.badRequest(
          `Receive qty ${line.quantity} exceeds outstanding ${outstanding} for ${line.variantId}`,
        );
      }

      await inventoryService.receive(
        {
          warehouseId: po.warehouseId.toString(),
          variantId: line.variantId,
          quantity: line.quantity,
          unitCost: item.unitCost,
          referenceType: 'purchase_order',
          referenceId: po._id.toString(),
          note: `PO ${po.poNumber} receiving`,
        },
        actor,
      );

      item.quantityReceived += line.quantity;
    }

    const allReceived = po.items.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = po.items.some((i) => i.quantityReceived > 0);
    po.status = allReceived ? PO_STATUS.RECEIVED : anyReceived ? PO_STATUS.PARTIAL : po.status;
    if (allReceived) po.receivedAt = new Date();
    await po.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: po.toObject() as Record<string, unknown>,
      metadata: { op: 'receive', lines },
    });

    return this.getById(id);
  }

  async cancel(id: string, actor: ActorMeta) {
    const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false });
    if (!po) throw ApiError.notFound('Purchase order not found');
    if (po.status === PO_STATUS.RECEIVED) {
      throw ApiError.badRequest('Cannot cancel a fully received PO');
    }

    // Reduce incoming for outstanding ordered qty
    if (po.status === PO_STATUS.ORDERED || po.status === PO_STATUS.PARTIAL) {
      for (const item of po.items) {
        const outstanding = item.quantityOrdered - item.quantityReceived;
        if (outstanding > 0) {
          const inv = await inventoryService.getOrCreateItem(
            po.warehouseId.toString(),
            item.variantId.toString(),
          );
          const reduce = Math.min(inv.incoming, outstanding);
          if (reduce > 0) {
            inv.incoming -= reduce;
            inv.version += 1;
            await inv.save();
          }
        }
      }
    }

    po.status = PO_STATUS.CANCELLED;
    await po.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: po.toObject() as Record<string, unknown>,
      metadata: { op: 'cancel' },
    });

    return po;
  }

  async remove(id: string, actor: ActorMeta) {
    const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false });
    if (!po) throw ApiError.notFound('Purchase order not found');
    if (po.status !== PO_STATUS.DRAFT && po.status !== PO_STATUS.CANCELLED) {
      throw ApiError.badRequest('Only draft/cancelled POs can be deleted');
    }
    po.isDeleted = true;
    po.deletedAt = new Date();
    await po.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.PURCHASE_ORDER_CHANGE,
      resourceType: 'purchase_orders',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { op: 'delete' },
    });

    return po;
  }
}

export const purchaseOrderService = new PurchaseOrderService();
