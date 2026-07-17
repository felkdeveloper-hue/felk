import { SupplierModel, SupplierProductModel } from '@/models/inventory.models';
import { CmsCrudService, type ActorMeta } from '@/services/cms-crud.service';
import { writeAuditLog } from '@/services/audit.service';
import { ApiError } from '@/utils/errors/api-error';
import { ProductVariantModel } from '@/models/product.models';
import { INVENTORY_AUDIT } from '@/constants/inventory';

export class SupplierService extends CmsCrudService {
  constructor() {
    super(
      'suppliers',
      SupplierModel,
      ['companyName', 'code', 'email'],
      ['createdAt', 'companyName', 'code'],
    );
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    if (payload.code) {
      payload.code = String(payload.code).toUpperCase();
      const existing = await SupplierModel.findOne({
        code: payload.code,
        isDeleted: false,
      });
      if (existing) {
        throw ApiError.conflict('Supplier code already exists');
      }
    }

    const doc = await super.create(payload, actor);
    await writeAuditLog({
      action: INVENTORY_AUDIT.SUPPLIER_CHANGE,
      resourceType: 'suppliers',
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
      const existing = await SupplierModel.findOne({
        code: payload.code,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (existing) throw ApiError.conflict('Supplier code already exists');
    }

    const doc = await super.update(id, payload, actor);
    await writeAuditLog({
      action: INVENTORY_AUDIT.SUPPLIER_CHANGE,
      resourceType: 'suppliers',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: doc.toObject() as Record<string, unknown>,
      metadata: { op: 'update' },
    });
    return doc;
  }

  async listProducts(supplierId: string) {
    await this.getById(supplierId);
    return SupplierProductModel.find({ supplierId, isDeleted: false }).sort({ createdAt: -1 });
  }

  async addProduct(supplierId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    await this.getById(supplierId);
    const variant = await ProductVariantModel.findOne({
      _id: payload.variantId,
      isDeleted: false,
    });
    if (!variant) throw ApiError.notFound('Product variant not found');

    try {
      const doc = await SupplierProductModel.create({
        supplierId,
        variantId: payload.variantId,
        productId: variant.productId,
        supplierSku: payload.supplierSku ?? null,
        unitCost: payload.unitCost ?? 0,
        currency: payload.currency ?? 'LKR',
        leadTimeDays: payload.leadTimeDays ?? 0,
        minOrderQty: payload.minOrderQty ?? 1,
        status: payload.status ?? 'active',
      });

      await writeAuditLog({
        action: INVENTORY_AUDIT.SUPPLIER_CHANGE,
        resourceType: 'supplier_products',
        resourceId: doc._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: doc.toObject() as Record<string, unknown>,
      });

      return doc;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Supplier product already linked');
      }
      throw error;
    }
  }

  async updateProduct(productLinkId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await SupplierProductModel.findOne({
      _id: productLinkId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Supplier product not found');

    const doc = await SupplierProductModel.findOneAndUpdate(
      { _id: productLinkId, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    await writeAuditLog({
      action: INVENTORY_AUDIT.SUPPLIER_CHANGE,
      resourceType: 'supplier_products',
      resourceId: productLinkId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: doc?.toObject() as Record<string, unknown>,
    });

    return doc;
  }

  async removeProduct(productLinkId: string, actor: ActorMeta) {
    const before = await SupplierProductModel.findOne({
      _id: productLinkId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Supplier product not found');

    const doc = await SupplierProductModel.findOneAndUpdate(
      { _id: productLinkId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await writeAuditLog({
      action: INVENTORY_AUDIT.SUPPLIER_CHANGE,
      resourceType: 'supplier_products',
      resourceId: productLinkId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      metadata: { op: 'delete' },
    });

    return doc;
  }
}

export const supplierService = new SupplierService();
