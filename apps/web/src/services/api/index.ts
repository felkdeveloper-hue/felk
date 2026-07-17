/**
 * HTTP client surface — components and SDK modules import from here,
 * never from axios directly.
 */
export { http, httpClient } from '@/lib/http-client';
export { AppError } from '@/lib/errors';
export type { AppErrorOptions } from '@/lib/errors';
