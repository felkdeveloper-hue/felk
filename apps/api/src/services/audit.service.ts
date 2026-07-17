import { AuditLogModel } from '@/models/audit-log.model';
import { ActivityLogModel } from '@/models/activity-log.model';
import { logger } from '@/config/logger';

export interface AuditInput {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  actorUserId?: string | null;
  actorType?: 'user' | 'system' | 'anonymous';
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await AuditLogModel.create({
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? (input.actorUserId ? 'user' : 'anonymous'),
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'Failed to write audit log');
  }
}

export async function writeActivityLog(input: {
  summary: string;
  module: string;
  actorUserId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await ActivityLogModel.create({
      actorUserId: input.actorUserId ?? null,
      summary: input.summary,
      module: input.module,
      ip: input.ip ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to write activity log');
  }
}
