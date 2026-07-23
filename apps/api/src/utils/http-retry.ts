import { logger } from '@/config/logger';

export interface HttpRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  /** Called before each retry with the attempt number (1-based) and last error. */
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface HttpRetryResult<T> {
  data: T;
  attempts: number;
}

const DEFAULT_OPTS: Required<Omit<HttpRetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  timeoutMs: 15_000,
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function calcDelay(attempt: number, baseMs: number, maxMs: number): number {
  const jitter = Math.random() * 200;
  return Math.min(baseMs * 2 ** (attempt - 1) + jitter, maxMs);
}

export class HttpRetryError extends Error {
  constructor(
    message: string,
    public readonly lastStatus?: number,
    public readonly attempts?: number,
  ) {
    super(message);
    this.name = 'HttpRetryError';
  }
}

/**
 * Fetch a URL with automatic exponential-backoff retries.
 * Retries on network failures and 5xx responses.
 * Throws `HttpRetryError` if all attempts fail.
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  init: RequestInit,
  opts: HttpRetryOptions = {},
): Promise<HttpRetryResult<T>> {
  const { maxAttempts, baseDelayMs, maxDelayMs, timeoutMs } = { ...DEFAULT_OPTS, ...opts };

  let lastError: unknown;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      lastStatus = res.status;

      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        const data = contentType.includes('application/json')
          ? ((await res.json()) as T)
          : ((await res.text()) as unknown as T);
        return { data, attempts: attempt };
      }

      if (res.status < 500) {
        const body = await res.text().catch(() => '');
        throw new HttpRetryError(`HTTP ${res.status}: ${body.slice(0, 200)}`, res.status, attempt);
      }

      const body = await res.text().catch(() => '');
      lastError = new HttpRetryError(
        `HTTP ${res.status}: ${body.slice(0, 200)}`,
        res.status,
        attempt,
      );
    } catch (err) {
      if (err instanceof HttpRetryError && err.lastStatus && err.lastStatus < 500) {
        throw err;
      }
      lastError = err;
    }

    if (attempt < maxAttempts) {
      const delay = calcDelay(attempt, baseDelayMs, maxDelayMs);
      logger.warn(
        { url, attempt, maxAttempts, delay, err: lastError },
        `fetchWithRetry: attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`,
      );
      opts.onRetry?.(attempt, lastError);
      await sleep(delay);
    }
  }

  throw new HttpRetryError(
    `All ${maxAttempts} attempts failed for ${url}: ${String(lastError)}`,
    lastStatus,
    maxAttempts,
  );
}
