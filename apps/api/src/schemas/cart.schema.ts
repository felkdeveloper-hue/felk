import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common.schema';

export const cartAddItemSchema = z.object({
  variantId: objectIdSchema,
  quantity: z.number().int().min(1).max(99).optional(),
  warehouseId: objectIdSchema.optional(),
});

export const cartUpdateItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
  warehouseId: objectIdSchema.optional(),
});

export const cartItemIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const cartItemIdsSchema = z.object({
  itemIds: z.array(objectIdSchema).min(1).max(100),
  warehouseId: objectIdSchema.optional(),
});

export const cartMergeSchema = z.object({
  guestCartToken: z.string().uuid().or(z.string().trim().min(8).max(80)),
});

export const cartAdminCustomerParamsSchema = z.object({
  customerId: objectIdSchema,
});
