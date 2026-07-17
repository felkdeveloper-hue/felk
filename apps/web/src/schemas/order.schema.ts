import { z } from 'zod';

export const returnRequestSchema = z.object({
  orderItemId: z.string().optional(),
  reason: z.string().min(1, 'Select a reason').max(500),
  description: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
});

export type ReturnRequestFormValues = z.infer<typeof returnRequestSchema>;
