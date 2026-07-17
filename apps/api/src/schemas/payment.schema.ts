import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common.schema';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';

const methodEnum = z.enum(Object.values(PAYMENT_METHOD) as [string, ...string[]]);

export const paymentCreateSchema = z
  .object({
    checkoutId: z.string().trim().min(1).optional(),
    checkoutToken: z.string().trim().min(1).optional(),
    method: methodEnum,
    returnUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })
  .refine((b) => Boolean(b.checkoutId || b.checkoutToken), {
    message: 'checkoutId or checkoutToken is required',
  });

export const paymentRetrySchema = z
  .object({
    paymentId: z.string().trim().min(1).optional(),
    checkoutToken: z.string().trim().min(1).optional(),
    method: methodEnum.optional(),
  })
  .refine((b) => Boolean(b.paymentId || b.checkoutToken), {
    message: 'paymentId or checkoutToken is required',
  });

export const paymentIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const checkoutTokenParamsSchema = z.object({
  checkoutToken: z.string().trim().min(1),
});

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(Object.values(PAYMENT_STATUS) as [string, ...string[]]).optional(),
  method: methodEnum.optional(),
  customerId: objectIdSchema.optional(),
  checkoutToken: z.string().trim().optional(),
});

export const refundRequestSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});
