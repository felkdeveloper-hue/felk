import { InventoryAlertModel, InventoryRuleModel } from '@/models/inventory.models';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { ALERT_STATUS } from '@/constants/inventory';

export class InventoryAlertService {
  async listAlerts(options: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    warehouseId?: string;
  }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    if (options.warehouseId) filter.warehouseId = options.warehouseId;

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      InventoryAlertModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      InventoryAlertModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async acknowledge(id: string, actor: ActorMeta) {
    const alert = await InventoryAlertModel.findById(id);
    if (!alert) throw ApiError.notFound('Alert not found');

    alert.status = ALERT_STATUS.ACKNOWLEDGED;
    alert.acknowledgedBy = actor.userId as never;
    alert.acknowledgedAt = new Date();
    await alert.save();
    return alert;
  }

  async resolve(id: string, actor: ActorMeta) {
    const alert = await InventoryAlertModel.findById(id);
    if (!alert) throw ApiError.notFound('Alert not found');

    alert.status = ALERT_STATUS.RESOLVED;
    alert.resolvedAt = new Date();
    if (!alert.acknowledgedAt) {
      alert.acknowledgedBy = actor.userId as never;
      alert.acknowledgedAt = new Date();
    }
    await alert.save();
    return alert;
  }

  async listRules(options: { page?: number; limit?: number; type?: string; warehouseId?: string }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };
    if (options.type) filter.type = options.type;
    if (options.warehouseId) filter.warehouseId = options.warehouseId;

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      InventoryRuleModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      InventoryRuleModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async createRule(payload: Record<string, unknown>, actor: ActorMeta) {
    const rule = await InventoryRuleModel.create({
      name: payload.name,
      type: payload.type,
      warehouseId: payload.warehouseId ?? null,
      variantId: payload.variantId ?? null,
      productId: payload.productId ?? null,
      threshold: payload.threshold,
      reorderQuantity: payload.reorderQuantity ?? null,
      notifyEmails: payload.notifyEmails ?? [],
      isActive: payload.isActive !== false,
    });

    await writeAuditLog({
      action: 'inventory.rule_created',
      resourceType: 'inventory_rules',
      resourceId: rule._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: rule.toObject() as Record<string, unknown>,
    });

    return rule;
  }

  async updateRule(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await InventoryRuleModel.findOne({ _id: id, isDeleted: false });
    if (!before) throw ApiError.notFound('Rule not found');

    const rule = await InventoryRuleModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    await writeAuditLog({
      action: 'inventory.rule_updated',
      resourceType: 'inventory_rules',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: rule?.toObject() as Record<string, unknown>,
    });

    return rule;
  }

  async removeRule(id: string, actor: ActorMeta) {
    const before = await InventoryRuleModel.findOne({ _id: id, isDeleted: false });
    if (!before) throw ApiError.notFound('Rule not found');

    const rule = await InventoryRuleModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await writeAuditLog({
      action: 'inventory.rule_deleted',
      resourceType: 'inventory_rules',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return rule;
  }
}

export const inventoryAlertService = new InventoryAlertService();
