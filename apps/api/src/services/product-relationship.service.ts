import { ProductRelationshipModel } from '@/models/product.models';
import { productRepository } from '@/repositories/product.repository';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { RELATIONSHIP_TYPES, type RelationshipType } from '@/constants/product';

export class ProductRelationshipService {
  async list(productId: string, type?: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    const filter: Record<string, unknown> = { productId, isDeleted: false };
    if (type) filter.type = type;

    return ProductRelationshipModel.find(filter)
      .sort({ sortOrder: 1 })
      .populate('relatedProductId', 'name slug status pricing');
  }

  async add(
    productId: string,
    payload: { relatedProductId: string; type: RelationshipType; sortOrder?: number },
    actor: ActorMeta,
  ) {
    if (productId === payload.relatedProductId) {
      throw ApiError.badRequest('Product cannot relate to itself');
    }

    const [product, related] = await Promise.all([
      productRepository.findById(productId),
      productRepository.findById(payload.relatedProductId),
    ]);
    if (!product) throw ApiError.notFound('Product not found');
    if (!related) throw ApiError.notFound('Related product not found');

    if (!Object.values(RELATIONSHIP_TYPES).includes(payload.type)) {
      throw ApiError.badRequest('Invalid relationship type');
    }

    try {
      const doc = await ProductRelationshipModel.create({
        productId,
        relatedProductId: payload.relatedProductId,
        type: payload.type,
        sortOrder: payload.sortOrder ?? 0,
      });

      await writeAuditLog({
        action: 'products.relationship_added',
        resourceType: 'product_relationships',
        resourceId: doc._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: doc.toObject() as Record<string, unknown>,
      });

      return doc;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Relationship already exists');
      }
      throw error;
    }
  }

  async remove(relationshipId: string, actor: ActorMeta) {
    const before = await ProductRelationshipModel.findOne({
      _id: relationshipId,
      isDeleted: false,
    });
    if (!before) throw ApiError.notFound('Relationship not found');

    const doc = await ProductRelationshipModel.findOneAndUpdate(
      { _id: relationshipId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    await writeAuditLog({
      action: 'products.relationship_removed',
      resourceType: 'product_relationships',
      resourceId: relationshipId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return doc;
  }

  async replaceType(
    productId: string,
    type: RelationshipType,
    relatedProductIds: string[],
    actor: ActorMeta,
  ) {
    await ProductRelationshipModel.updateMany(
      { productId, type, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );

    const created = [];
    for (const [index, relatedProductId] of relatedProductIds.entries()) {
      created.push(await this.add(productId, { relatedProductId, type, sortOrder: index }, actor));
    }
    return created;
  }
}

export const productRelationshipService = new ProductRelationshipService();
