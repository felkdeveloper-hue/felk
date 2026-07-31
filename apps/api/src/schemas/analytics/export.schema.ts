import { z } from 'zod';
import { analyticsFilterSchema } from './query.schema.js';

export const exportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);
export const exportScopeSchema = z.enum(['all', 'page']);

export const createExportBodySchema = z.object({
  reportType: z.string().min(1).max(64),
  format: exportFormatSchema,
  filter: analyticsFilterSchema.optional(),
  scope: exportScopeSchema.optional().default('all'),
  columns: z.array(z.string().min(1)).max(64).optional(),
  drillLabel: z.string().max(200).optional(),
});

export type CreateExportBody = z.infer<typeof createExportBodySchema>;
