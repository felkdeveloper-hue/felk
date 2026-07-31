import { z } from 'zod';

export const ANALYTICS_PERIODS = ['today', 'yesterday', '7d', '30d', '90d', 'custom'] as const;

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(ANALYTICS_PERIODS).optional(),
});

export const analyticsFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(ANALYTICS_PERIODS).optional(),
  userId: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  browser: z.string().optional(),
  device: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).optional(),
  productId: z.string().optional(),
  category: z.string().optional(),
  brandId: z.string().optional(),
  orderStatus: z.string().optional(),
  trafficSource: z.string().optional(),
  sessionId: z.string().optional(),
  eventName: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const eventsFilterSchema = analyticsFilterSchema;

export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>;
export type EventsFilter = z.infer<typeof eventsFilterSchema>;
