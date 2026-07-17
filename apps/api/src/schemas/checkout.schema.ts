import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common.schema';
import { SHIPPING_METHOD, DELIVERY_METHOD } from '@/constants/checkout';

export const checkoutStartSchema = z.object({
  shippingAddressId: objectIdSchema.optional(),
  billingAddressId: objectIdSchema.optional(),
  shippingMethod: z.enum(Object.values(SHIPPING_METHOD) as [string, ...string[]]).optional(),
  deliveryMethod: z.enum(Object.values(DELIVERY_METHOD) as [string, ...string[]]).optional(),
  couponCode: z.string().trim().max(80).optional(),
  giftCardCode: z.string().trim().max(80).optional(),
  autoReserve: z.boolean().optional(),
});

export const checkoutRefreshSchema = z.object({
  shippingAddressId: objectIdSchema.optional(),
  billingAddressId: objectIdSchema.optional(),
  shippingMethod: z.enum(Object.values(SHIPPING_METHOD) as [string, ...string[]]).optional(),
  deliveryMethod: z.enum(Object.values(DELIVERY_METHOD) as [string, ...string[]]).optional(),
  couponCode: z.string().trim().max(80).nullable().optional(),
  giftCardCode: z.string().trim().max(80).nullable().optional(),
  extendReservation: z.boolean().optional(),
});

export const checkoutIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});
