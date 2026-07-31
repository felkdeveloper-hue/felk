import { z } from 'zod';

export const widgetSettingsSchema = z
  .object({
    period: z.string().max(32).optional(),
    chartType: z.string().max(32).optional(),
    metric: z.string().max(64).optional(),
    refreshInterval: z.number().int().min(5).max(3600).optional(),
    displayMode: z.string().max(32).optional(),
  })
  .passthrough();

export const widgetPlacementSchema = z.object({
  i: z.string().min(1).max(128),
  widgetId: z.string().min(1).max(64),
  x: z.number().int().min(0).max(24),
  y: z.number().int().min(0).max(500),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
  minW: z.number().int().min(1).max(12).optional(),
  minH: z.number().int().min(1).max(20).optional(),
  maxW: z.number().int().min(1).max(12).optional(),
  maxH: z.number().int().min(1).max(20).optional(),
  hidden: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  pinned: z.boolean().optional(),
  settings: widgetSettingsSchema.optional(),
});

export const layoutSnapshotSchema = z.object({
  widgets: z.array(widgetPlacementSchema).max(64),
  theme: z.record(z.unknown()).optional(),
});

export const saveDashboardLayoutBodySchema = z.object({
  activeKey: z.string().min(1).max(64).optional(),
  layoutKey: z.string().min(1).max(64).optional().default('personal'),
  widgets: z.array(widgetPlacementSchema).max(64),
  theme: z.record(z.unknown()).optional(),
});

export const applyTemplateBodySchema = z.object({
  templateId: z.string().min(1).max(64),
  /** When true, copy into personal; otherwise switch to template key without wiping personal */
  overwritePersonal: z.boolean().optional().default(false),
});

export const importLayoutBodySchema = z.object({
  layoutKey: z.string().min(1).max(64).optional().default('personal'),
  snapshot: layoutSnapshotSchema,
  setActive: z.boolean().optional().default(true),
});

export const duplicateLayoutBodySchema = z.object({
  fromKey: z.string().min(1).max(64),
  toKey: z.string().min(1).max(64),
  setActive: z.boolean().optional().default(false),
});

export type SaveDashboardLayoutBody = z.infer<typeof saveDashboardLayoutBodySchema>;
export type ApplyTemplateBody = z.infer<typeof applyTemplateBodySchema>;
export type ImportLayoutBody = z.infer<typeof importLayoutBodySchema>;
export type DuplicateLayoutBody = z.infer<typeof duplicateLayoutBodySchema>;
