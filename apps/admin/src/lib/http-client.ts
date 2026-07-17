import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config';
import { useAuthStore } from '@/store/auth-store';
import { AppError } from './errors';
import type { ApiErrorBody, ApiSuccessBody, PaginatedResult } from '@/types';

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? new AxiosHeaders();
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !config.headers.get('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await httpClient.request<ApiSuccessBody<T>>(config);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorBody>;
      if (axiosError.response?.status === 401 && !config._retry) {
        const token = await refreshOnce();
        if (token) {
          config._retry = true;
          config.headers = config.headers ?? new AxiosHeaders();
          (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
          const response = await httpClient.request<ApiSuccessBody<T>>(config);
          return response.data.data;
        }
      }
      throw AppError.fromAxiosError(axiosError);
    }
    throw AppError.fromAxiosError(error as AxiosError<ApiErrorBody>);
  }
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

async function refreshOnce(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => refreshWaiters.push(resolve));
  }
  isRefreshing = true;
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    isRefreshing = false;
    useAuthStore.getState().clearSession();
    return null;
  }
  try {
    const response = await axios.post<
      ApiSuccessBody<{ accessToken: string; refreshToken: string }>
    >(`${env.apiUrl}/auth/refresh`, { refreshToken }, { withCredentials: true });
    const { accessToken, refreshToken: nextRefresh } = response.data.data;
    useAuthStore.getState().setTokens({ accessToken, refreshToken: nextRefresh });
    refreshWaiters.forEach((resolve) => resolve(accessToken));
    refreshWaiters = [];
    return accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    refreshWaiters.forEach((resolve) => resolve(null));
    refreshWaiters = [];
    return null;
  } finally {
    isRefreshing = false;
  }
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
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),
  getPaginated: <T>(url: string, config?: AxiosRequestConfig) =>
    requestPaginated<T>({ ...config, method: 'GET', url }),
};
