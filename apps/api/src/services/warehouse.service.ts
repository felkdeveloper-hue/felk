import { WarehouseModel } from '@/models/inventory.models';
import { CmsCrudService, type ActorMeta } from '@/services/cms-crud.service';
import { writeAuditLog } from '@/services/audit.service';
import { ApiError } from '@/utils/errors/api-error';
import { INVENTORY_AUDIT } from '@/constants/inventory';

export class WarehouseService extends CmsCrudService {
  constructor() {
    super(
      'warehouses',
      WarehouseModel,
      ['name', 'code'],
      ['createdAt', 'name', 'code', 'priority'],
    );
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    if (payload.code) {
      payload.code = String(payload.code).toUpperCase();
      const existing = await WarehouseModel.findOne({
        code: payload.code,
        isDeleted: false,
      });
      if (existing) {
        throw ApiError.conflict('Warehouse code already exists', undefined, 'CODE_EXISTS');
      }
    }

    if (payload.isDefault === true) {
      await WarehouseModel.updateMany({ isDeleted: false }, { $set: { isDefault: false } });
    }

    const doc = await super.create(payload, actor);

    await writeAuditLog({
      action: INVENTORY_AUDIT.WAREHOUSE_CHANGE,
      resourceType: 'warehouses',
      resourceId: doc._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: doc.toObject() as Record<string, unknown>,
      metadata: { op: 'create' },
    });

    return doc;
  }

  override async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    if (payload.code) {
      payload.code = String(payload.code).toUpperCase();
      const existing = await WarehouseModel.findOne({
        code: payload.code,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (existing) {
        throw ApiError.conflict('Warehouse code already exists', undefined, 'CODE_EXISTS');
      }
    }

    if (payload.isDefault === true) {
      await WarehouseModel.updateMany(
        { _id: { $ne: id }, isDeleted: false },
        { $set: { isDefault: false } },
      );
    }

    const doc = await super.update(id, payload, actor);

    await writeAuditLog({
      action: INVENTORY_AUDIT.WAREHOUSE_CHANGE,
      resourceType: 'warehouses',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: doc.toObject() as Record<string, unknown>,
      metadata: { op: 'update' },
    });

    return doc;
  }
}

export const warehouseService = new WarehouseService();
