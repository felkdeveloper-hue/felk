import { z } from 'zod';
import { AuditLogModel } from '@/models/audit-log.model';
import { paginationQuerySchema } from '@/schemas/common.schema';
import { buildPaginationMeta } from '@/utils/pagination';

export const auditListQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(120).optional(),
  resourceType: z.string().trim().max(120).optional(),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

function toPlain(doc: { toObject?: () => Record<string, unknown> } | Record<string, unknown>) {
  if (doc && typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function') {
    return (doc as { toObject: () => Record<string, unknown> }).toObject();
  }
  return doc as Record<string, unknown>;
}

export class AdminAuditService {
  async list(options: AuditListQuery) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const filter: Record<string, unknown> = {};

    if (options.action) filter.action = options.action;
    if (options.resourceType) filter.resourceType = options.resourceType;
    if (options.q) {
      const regex = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { action: regex },
        { resourceType: regex },
        { resourceId: regex },
        { requestId: regex },
      ];
    }

    const [total, rows] = await Promise.all([
      AuditLogModel.countDocuments(filter),
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return {
      data: rows.map((row) => {
        const plain = toPlain(row);
        return {
          id: String(plain._id),
          action: plain.action,
          resourceType: plain.resourceType,
          resourceId: plain.resourceId ?? null,
          actorType: plain.actorType,
          actorUserId: plain.actorUserId ? String(plain.actorUserId) : null,
          ip: plain.ip ?? null,
          requestId: plain.requestId ?? null,
          metadata: plain.metadata ?? {},
          createdAt: plain.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}

export const adminAuditService = new AdminAuditService();
