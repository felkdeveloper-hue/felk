import type { PaginationMeta, PaginationParams, PaginationResult } from '@/types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(input: {
  page?: number | string;
  limit?: number | string;
}): Required<Pick<PaginationParams, 'page' | 'limit'>> {
  const page = Math.max(1, Number(input.page) || DEFAULT_PAGE);
  const rawLimit = Number(input.limit) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  return { page, limit };
}

export function getPaginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function paginateArray<T>(items: T[], page: number, limit: number): PaginationResult<T> {
  const total = items.length;
  const skip = getPaginationSkip(page, limit);
  const data = items.slice(skip, skip + limit);

  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
