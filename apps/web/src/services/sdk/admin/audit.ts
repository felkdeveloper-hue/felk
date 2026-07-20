import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AuditLogRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  actorType: string;
  actorUserId?: string | null;
  ip?: string | null;
  requestId?: string | null;
  createdAt?: string;
}

export interface AuditListParams extends ListQueryParams {
  action?: string;
  resourceType?: string;
}

function normalizeAudit(raw: unknown): AuditLogRow {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    action: String(record.action ?? ''),
    resourceType: String(record.resourceType ?? ''),
    resourceId: record.resourceId ? String(record.resourceId) : null,
    actorType: String(record.actorType ?? 'anonymous'),
    actorUserId: record.actorUserId ? String(record.actorUserId) : null,
    ip: typeof record.ip === 'string' ? record.ip : null,
    requestId: typeof record.requestId === 'string' ? record.requestId : null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export const auditApi = {
  async list(params?: AuditListParams): Promise<PaginatedResult<AuditLogRow>> {
    const result = await http.getPaginated<unknown>('/audit', { params });
    return { ...result, data: normalizeList(result.data, normalizeAudit) };
  },
};
