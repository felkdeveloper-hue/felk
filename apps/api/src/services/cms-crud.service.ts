import type { Model } from 'mongoose';
import type { Request } from 'express';
import { BaseRepository, type ListOptions } from '@/repositories/base.repository';
import { writeActivityLog, writeAuditLog } from '@/services/audit.service';
import { ApiError } from '@/utils/errors/api-error';
import { slugify } from '@/utils/slug.helper';

export interface ActorMeta {
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export function actorFromRequest(req: Request): ActorMeta {
  return {
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
    requestId: req.requestId,
  };
}

/** Resources that use title/name only — no slug uniqueness. */
const SLUGLESS_RESOURCES = new Set([
  'hero_banners',
  'promo_banners',
  'announcements',
  'faqs',
  'social_links',
  'contact_infos',
]);

/** eslint-disable @typescript-eslint/no-explicit-any */
export class CmsCrudService {
  protected readonly repo: BaseRepository;

  constructor(
    protected readonly resource: string,
    model: Model<any>,
    searchFields?: string[],
    sortableFields?: string[],
  ) {
    this.repo = new BaseRepository(model, searchFields, sortableFields);
  }

  list(options: ListOptions & Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, q, status, includeDeleted, filters, ...rest } = options;

    const mergedFilters: Record<string, unknown> = { ...(filters ?? {}) };
    for (const key of ['placement', 'type', 'key'] as const) {
      const value = rest[key];
      if (typeof value === 'string' && value.length > 0) {
        mergedFilters[key] = value;
      }
    }

    return this.repo.list({
      page,
      limit,
      sortBy,
      sortOrder,
      q,
      status,
      includeDeleted,
      filters: mergedFilters,
    });
  }

  async getById(id: string, includeDeleted = false) {
    const doc = await this.repo.findById(id, includeDeleted);
    if (!doc) throw ApiError.notFound(`${this.resource} not found`);
    return doc;
  }

  async create(payload: Record<string, unknown>, actor: ActorMeta) {
    if (SLUGLESS_RESOURCES.has(this.resource)) {
      delete payload.slug;
    } else {
      if (payload.name && !payload.slug) {
        payload.slug = slugify(String(payload.name));
      }
      if (payload.title && !payload.slug) {
        payload.slug = slugify(String(payload.title));
      }

      if (payload.slug) {
        const existing = await this.repo.findBySlug(String(payload.slug));
        if (existing) {
          throw ApiError.conflict('Slug already exists', undefined, 'SLUG_EXISTS');
        }
      }
    }

    const doc = await this.repo.create(payload);

    await writeAuditLog({
      action: `${this.resource}.create`,
      resourceType: this.resource,
      resourceId: doc._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      requestId: actor.requestId,
      after: doc.toObject() as Record<string, unknown>,
    });

    await writeActivityLog({
      summary: `Created ${this.resource}`,
      module: this.resource,
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { id: doc._id.toString() },
    });

    return doc;
  }

  async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await this.getById(id);

    if (payload.slug && payload.slug !== before.slug) {
      const existing = await this.repo.findBySlug(String(payload.slug));
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict('Slug already exists', undefined, 'SLUG_EXISTS');
      }
    }

    const doc = await this.repo.updateById(id, { $set: payload });

    await writeAuditLog({
      action: `${this.resource}.update`,
      resourceType: this.resource,
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: doc.toObject() as Record<string, unknown>,
    });

    await writeActivityLog({
      summary: `Updated ${this.resource}`,
      module: this.resource,
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { id },
    });

    return doc;
  }

  async remove(id: string, actor: ActorMeta) {
    const before = await this.getById(id);
    const doc = await this.repo.softDelete(id);

    await writeAuditLog({
      action: `${this.resource}.delete`,
      resourceType: this.resource,
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return doc;
  }

  async restore(id: string, actor: ActorMeta) {
    const doc = await this.repo.restore(id);
    await writeAuditLog({
      action: `${this.resource}.restore`,
      resourceType: this.resource,
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: doc.toObject() as Record<string, unknown>,
    });
    return doc;
  }

  async bulkDelete(ids: string[], actor: ActorMeta) {
    const count = await this.repo.bulkSoftDelete(ids);
    await writeAuditLog({
      action: `${this.resource}.bulk_delete`,
      resourceType: this.resource,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { ids, count },
    });
    return { count };
  }

  async bulkStatus(ids: string[], status: string, actor: ActorMeta) {
    const count = await this.repo.bulkUpdateStatus(ids, status);
    await writeAuditLog({
      action: `${this.resource}.bulk_status`,
      resourceType: this.resource,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { ids, status, count },
    });
    return { count };
  }

  async exportAll(options: ListOptions) {
    return this.repo.list({ ...options, page: 1, limit: 100 });
  }
}
