import { z } from 'zod';
import { REGEX } from '@/constants/regex';

export const objectIdSchema = z.string().regex(REGEX.OBJECT_ID, 'Invalid ObjectId');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  q: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
