import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { AppError } from './errors';
import type { ApiErrorBody, ApiSuccessBody, PaginatedResult } from '@/types';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Marks a request as already retried once after a token refresh. */
    _retry?: boolean;
    /** Opt a specific request out of the 401 refresh-and-retry flow. */
    skipAuthRefresh?: boolean;
  }
}

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestId = generateRequestId();
  config.headers = config.headers ?? new AxiosHeaders();
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  config.headers.set('X-Request-Id', requestId);

  const { accessToken } = useAuthStore.getState();
  if (accessToken && !config.headers.get('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const { guestCartToken } = useCartStore.getState();
  if (guestCartToken && !config.headers.get('x-guest-cart-token')) {
    config.headers.set('x-guest-cart-token', guestCartToken);
  }

  if (env.isDev) {
    (config as InternalAxiosRequestConfig & { metadata?: { startedAt: number } }).metadata = {
      startedAt: Date.now(),
    };
    // eslint-disable-next-line no-console
    console.debug(`%c[http] -> ${config.method?.toUpperCase()} ${config.url}`, 'color:#6366f1', {
      requestId,
      params: config.params,
      data: config.data,
    });
  }

  return config;
});

/* -------------------------------------------------------------------------- */
/* 401 refresh-once queue                                                    */
/* -------------------------------------------------------------------------- */

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function awaitRefresh(): Promise<string | null> {
  return new Promise((resolve) => {
    refreshWaiters.push(resolve);
  });
}

function resolveRefreshWaiters(token: string | null): void {
  refreshWaiters.forEach((resolve) => resolve(token));
  refreshWaiters = [];
}

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const response = await axios.post<
      ApiSuccessBody<{ accessToken: string; refreshToken: string }>
    >(`${env.apiUrl}/auth/refresh`, { refreshToken }, { withCredentials: true });
    const { accessToken, refreshToken: nextRefreshToken } = response.data.data;
    useAuthStore.getState().setTokens({ accessToken, refreshToken: nextRefreshToken });
    return accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

httpClient.interceptors.response.use(
  (response) => {
    if (env.isDev) {
      const config = response.config as InternalAxiosRequestConfig & {
        metadata?: { startedAt: number };
      };
      const durationMs = config.metadata ? Date.now() - config.metadata.startedAt : undefined;
      // eslint-disable-next-line no-console
      console.debug(
        `%c[http] <- ${response.status} ${config.method?.toUpperCase()} ${config.url}${
          durationMs !== undefined ? ` (${durationMs}ms)` : ''
        }`,
        'color:#22c55e',
      );
    }
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (env.isDev) {
      // eslint-disable-next-line no-console
      console.debug(
        `%c[http] x ${error.response?.status ?? 'ERR'} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
        'color:#ef4444',
        error.response?.data,
      );
    }

    const isAuthRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isAuthRefreshCall;

    if (shouldAttemptRefresh && originalRequest) {
      originalRequest._retry = true;

      if (isRefreshing) {
        const token = await awaitRefresh();
        if (!token) return Promise.reject(AppError.fromAxiosError(error));
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
        return httpClient(originalRequest);
      }

      isRefreshing = true;
      const token = await performRefresh();
      isRefreshing = false;
      resolveRefreshWaiters(token);

      if (!token) return Promise.reject(AppError.fromAxiosError(error));

      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
      return httpClient(originalRequest);
    }

    return Promise.reject(AppError.fromAxiosError(error));
  },
);

/* -------------------------------------------------------------------------- */
/* Typed request helpers — the only surface components/SDK modules touch     */
/* -------------------------------------------------------------------------- */

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.request<ApiSuccessBody<T>>(config);
  return response.data.data;
}

async function requestPaginated<T>(config: AxiosRequestConfig): Promise<PaginatedResult<T>> {
  const response = await httpClient.request<ApiSuccessBody<T[]>>(config);
  return {
    data: response.data.data,
    meta: response.data.meta ?? {
      page: 1,
      limit: response.data.data.length,
      total: response.data.data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'GET', url }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'POST', url, data }),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PATCH', url, data }),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PUT', url, data }),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'DELETE', url }),

  getPaginated: <T>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResult<T>> =>
    requestPaginated<T>({ ...config, method: 'GET', url }),
};
