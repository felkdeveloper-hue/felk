export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface MessageResult {
  message: string;
}

export interface ApiSuccessBody<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
