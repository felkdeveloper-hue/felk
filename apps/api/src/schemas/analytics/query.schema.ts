import { z } from 'zod';

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['today', 'yesterday', '7d', '30d', 'custom']).optional(),
});

export const analyticsFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['today', 'yesterday', '7d', '30d', 'custom']).optional(),
  userId: z.string().optional(),
  country: z.string().optional(),
  browser: z.string().optional(),
  device: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const eventsFilterSchema = analyticsFilterSchema.extend({
  eventName: z.string().optional(),
});

export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>;
export type EventsFilter = z.infer<typeof eventsFilterSchema>;
