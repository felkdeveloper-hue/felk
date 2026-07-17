import { CustomerNoteModel, CustomerTagModel, CustomerModel } from '@/models/customer.models';
import { customerService } from '@/services/customer.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { CUSTOMER_AUDIT, SYSTEM_CUSTOMER_TAGS } from '@/constants/customer';
import { slugify } from '@/utils/slug.helper';

export class CustomerNoteService {
  async list(customerId: string) {
    await customerService.getById(customerId);
    return CustomerNoteModel.find({ customerId, isDeleted: false })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate('authorUserId', 'firstName lastName email');
  }

  async create(
    customerId: string,
    payload: { body: string; isPinned?: boolean },
    actor: ActorMeta,
  ) {
    await customerService.getById(customerId);
    if (!actor.userId) throw ApiError.unauthorized();

    const note = await CustomerNoteModel.create({
      customerId,
      authorUserId: actor.userId,
      body: payload.body,
      isPinned: Boolean(payload.isPinned),
    });

    await writeAuditLog({
      action: CUSTOMER_AUDIT.NOTE_ADDED,
      resourceType: 'customer_notes',
      resourceId: note._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: note.toObject() as Record<string, unknown>,
      metadata: { customerId },
    });

    return note;
  }

  async update(
    customerId: string,
    noteId: string,
    payload: Record<string, unknown>,
    actor: ActorMeta,
  ) {
    const note = await CustomerNoteModel.findOneAndUpdate(
      { _id: noteId, customerId, isDeleted: false },
      { $set: payload },
      { new: true },
    );
    if (!note) throw ApiError.notFound('Note not found');

    await writeAuditLog({
      action: 'customers.note_updated',
      resourceType: 'customer_notes',
      resourceId: noteId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: note.toObject() as Record<string, unknown>,
    });

    return note;
  }

  async remove(customerId: string, noteId: string, actor: ActorMeta) {
    const note = await CustomerNoteModel.findOneAndUpdate(
      { _id: noteId, customerId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );
    if (!note) throw ApiError.notFound('Note not found');

    await writeAuditLog({
      action: 'customers.note_deleted',
      resourceType: 'customer_notes',
      resourceId: noteId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });

    return note;
  }
}

export class CustomerTagService {
  async seedSystemTags() {
    const names: Record<string, string> = {
      vip: 'VIP',
      wholesale: 'Wholesale',
      blocked: 'Blocked',
      employee: 'Employee',
      influencer: 'Influencer',
    };

    for (const key of SYSTEM_CUSTOMER_TAGS) {
      await CustomerTagModel.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            name: names[key] ?? key,
            isSystem: true,
            description: `System tag: ${names[key] ?? key}`,
          },
        },
        { upsert: true },
      );
    }

    return CustomerTagModel.find({ isDeleted: false }).sort({ name: 1 });
  }

  async list() {
    const count = await CustomerTagModel.countDocuments({ isDeleted: false });
    if (count === 0) return this.seedSystemTags();
    return CustomerTagModel.find({ isDeleted: false }).sort({ name: 1 });
  }

  async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const key =
      (payload.key as string | undefined)?.toLowerCase() ??
      slugify(String(payload.name)).replace(/-/g, '_');

    try {
      const tag = await CustomerTagModel.create({
        key,
        name: payload.name,
        color: payload.color ?? null,
        description: payload.description ?? null,
        isSystem: false,
      });

      await writeAuditLog({
        action: CUSTOMER_AUDIT.TAGS_CHANGED,
        resourceType: 'customer_tags',
        resourceId: tag._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: tag.toObject() as Record<string, unknown>,
        metadata: { op: 'create_tag' },
      });

      return tag;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw ApiError.conflict('Tag key already exists');
      }
      throw error;
    }
  }

  async assignTags(customerId: string, tagKeys: string[], actor: ActorMeta) {
    const customer = await customerService.getById(customerId);
    const tags = await CustomerTagModel.find({
      key: { $in: tagKeys.map((k) => k.toLowerCase()) },
      isDeleted: false,
    });

    if (tags.length !== tagKeys.length) {
      throw ApiError.badRequest('One or more tags not found');
    }

    const before = { tagKeys: customer.tagKeys, tagIds: customer.tagIds };
    customer.tagIds = tags.map((t) => t._id);
    customer.tagKeys = tags.map((t) => t.key);
    await customer.save();

    await writeAuditLog({
      action: CUSTOMER_AUDIT.TAGS_CHANGED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before,
      after: { tagKeys: customer.tagKeys, tagIds: customer.tagIds },
    });

    return customer;
  }

  async addTag(customerId: string, tagKey: string, actor: ActorMeta) {
    const customer = await customerService.getById(customerId);
    const tag = await CustomerTagModel.findOne({
      key: tagKey.toLowerCase(),
      isDeleted: false,
    });
    if (!tag) throw ApiError.notFound('Tag not found');

    if (!customer.tagKeys.includes(tag.key)) {
      customer.tagKeys.push(tag.key);
      customer.tagIds.push(tag._id);
      await customer.save();

      await writeAuditLog({
        action: CUSTOMER_AUDIT.TAGS_CHANGED,
        resourceType: 'customers',
        resourceId: customerId,
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        metadata: { op: 'add', tag: tag.key },
      });
    }

    return customer;
  }

  async removeTag(customerId: string, tagKey: string, actor: ActorMeta) {
    const customer = await customerService.getById(customerId);
    const key = tagKey.toLowerCase();
    const tag = await CustomerTagModel.findOne({ key, isDeleted: false });

    customer.tagKeys = customer.tagKeys.filter((k) => k !== key);
    if (tag) {
      customer.tagIds = customer.tagIds.filter((id) => id.toString() !== tag._id.toString());
    }
    await customer.save();

    await writeAuditLog({
      action: CUSTOMER_AUDIT.TAGS_CHANGED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { op: 'remove', tag: key },
    });

    return customer;
  }

  async removeTagDefinition(tagId: string, actor: ActorMeta) {
    const tag = await CustomerTagModel.findOne({ _id: tagId, isDeleted: false });
    if (!tag) throw ApiError.notFound('Tag not found');
    if (tag.isSystem) throw ApiError.badRequest('Cannot delete system tags');

    tag.isDeleted = true;
    tag.deletedAt = new Date();
    await tag.save();

    await CustomerModel.updateMany(
      { tagKeys: tag.key },
      { $pull: { tagKeys: tag.key, tagIds: tag._id } },
    );

    await writeAuditLog({
      action: CUSTOMER_AUDIT.TAGS_CHANGED,
      resourceType: 'customer_tags',
      resourceId: tagId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { op: 'delete_tag' },
    });

    return tag;
  }
}

export const customerNoteService = new CustomerNoteService();
export const customerTagService = new CustomerTagService();
