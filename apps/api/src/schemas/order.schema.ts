import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common.schema';
import { ORDER_STATUS } from '@/constants/order-status';

const statusEnum = z.enum(Object.values(ORDER_STATUS) as [string, ...string[]]);

export const orderIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const orderNumberParamsSchema = z.object({
  orderNumber: z.string().trim().min(1),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: statusEnum.optional(),
  customerId: objectIdSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: statusEnum,
  note: z.string().trim().max(500).optional(),
});

export const orderCancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const orderNoteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  isInternal: z.boolean().optional(),
});

export const orderReturnRequestSchema = z.object({
  orderItemId: objectIdSchema.optional(),
  reason: z.string().trim().min(1).max(500),
  description: z.string().trim().max(2000).optional(),
  images: z.array(z.string().trim().min(1)).max(10).optional(),
});
