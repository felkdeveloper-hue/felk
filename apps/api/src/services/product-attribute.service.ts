import { AttributeValueModel, ProductAttributeModel } from '@/models/product.models';
import { BaseRepository } from '@/repositories/base.repository';
import { CmsCrudService } from '@/services/cms-crud.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';

class AttributeRepository extends BaseRepository {
  constructor() {
    super(ProductAttributeModel, ['name', 'code'], ['createdAt', 'name', 'sortOrder']);
  }

  async findByCode(code: string) {
    return ProductAttributeModel.findOne({ code, isDeleted: false });
  }
}

const attributeRepo = new AttributeRepository();

export class ProductAttributeService extends CmsCrudService {
  constructor() {
    super(
      'attributes',
      ProductAttributeModel,
      ['name', 'code'],
      ['createdAt', 'name', 'sortOrder'],
    );
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const code = payload.code
      ? String(payload.code)
      : slugify(String(payload.name)).replace(/-/g, '_');

    const existing = await attributeRepo.findByCode(code);
    if (existing) {
      throw ApiError.conflict('Attribute code already exists', undefined, 'CODE_EXISTS');
    }

    return super.create({ ...payload, code }, actor);
  }
}

export const productAttributeService = new ProductAttributeService();

export class AttributeValueService {
  async listByAttribute(attributeId: string) {
    const attr = await ProductAttributeModel.findOne({
      _id: attributeId,
      isDeleted: false,
    });
    if (!attr) throw ApiError.notFound('Attribute not found');

    return AttributeValueModel.find({ attributeId, isDeleted: false }).sort({
      sortOrder: 1,
      label: 1,
    });
  }

  async create(attributeId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const attr = await ProductAttributeModel.findOne({
      _id: attributeId,
      isDeleted: false,
    });
    if (!attr) throw ApiError.notFound('Attribute not found');

    const value = String(payload.value ?? payload.label);
    try {
      const doc = await AttributeValueModel.create({
        attributeId,
        value,
        label: payload.label ?? value,
        sortOrder: payload.sortOrder ?? 0,
        status: payload.status ?? 'active',
      });

      await writeAuditLog({
        action: 'attributes.value_created',
        resourceType: 'attribute_values',
        resourceId: doc._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: doc.toObject() as Record<string, unknown>,
      });

      return doc;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Attribute value already exists');
      }
      throw error;
    }
  }

  async update(valueId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await AttributeValueModel.findOne({ _id: valueId, isDeleted: false });
    if (!before) throw ApiError.notFound('Attribute value not found');

    const doc = await AttributeValueModel.findOneAndUpdate(
      { _id: valueId, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    await writeAuditLog({
      action: 'attributes.value_updated',
      resourceType: 'attribute_values',
      resourceId: valueId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: doc?.toObject() as Record<string, unknown>,
    });

    return doc;
  }

  async remove(valueId: string, actor: ActorMeta) {
    const before = await AttributeValueModel.findOne({ _id: valueId, isDeleted: false });
    if (!before) throw ApiError.notFound('Attribute value not found');

    const doc = await AttributeValueModel.findOneAndUpdate(
      { _id: valueId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await writeAuditLog({
      action: 'attributes.value_deleted',
      resourceType: 'attribute_values',
      resourceId: valueId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return doc;
  }
}

export const attributeValueService = new AttributeValueService();
