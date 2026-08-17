import { HTTP_STATUS } from '@/constants/http.js';
import { env } from '@/config/env.js';
import { ApiError } from '@/utils/errors/api-error.js';
import {
  FED_STATUS_MESSAGES,
  type FedApiResponse,
  type FedParcelPayload,
} from '@/services/couriers/fed.types.js';

const FED_NEW_WAYBILL_URL = 'https://www.fdedomestic.com/api/parcel/new_api_v1.php';
const FED_EXISTING_WAYBILL_URL =
  'https://www.fdedomestic.com/api/parcel/existing_waybill_api_v1.php';

function isFedConfigured(): boolean {
  return Boolean(env.FED_CLIENT_ID && env.FED_API_KEY && env.FED_ENABLED);
}

function authFields(): { client_id: string; api_key: string } {
  if (!env.FED_CLIENT_ID || !env.FED_API_KEY) {
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      'FED courier integration is not configured',
      'FED_NOT_CONFIGURED',
    );
  }
  return { client_id: env.FED_CLIENT_ID, api_key: env.FED_API_KEY };
}

async function postForm(url: string, fields: Record<string, string>): Promise<FedApiResponse> {
  const body = new URLSearchParams(fields);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      `FED API HTTP ${response.status}`,
      'FED_HTTP_ERROR',
    );
  }

  let parsed: FedApiResponse;
  try {
    parsed = (await response.json()) as FedApiResponse;
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'FED API returned invalid JSON',
      'FED_INVALID_RESPONSE',
    );
  }

  return parsed;
}

function assertFedSuccess(result: FedApiResponse, context: 'new' | 'existing'): string {
  if (result.status === 200 && result.waybill_no) {
    return result.waybill_no;
  }

  const message =
    FED_STATUS_MESSAGES[result.status] ??
    `FED ${context} waybill request failed (status ${result.status})`;

  throw ApiError.badRequest(message, { fedStatus: result.status }, 'FED_API_ERROR');
}

export const fedClient = {
  isConfigured: isFedConfigured,

  getWebhookUrl(): string {
    const base = env.API_PUBLIC_URL.replace(/\/$/, '');
    return `${base}${env.API_PREFIX}/integrations/fed/webhook`;
  },

  async createNewWaybill(payload: FedParcelPayload): Promise<string> {
    const result = await postForm(FED_NEW_WAYBILL_URL, {
      ...authFields(),
      ...payload,
    });
    return assertFedSuccess(result, 'new');
  },

  async createExistingWaybill(payload: FedParcelPayload & { waybill_id: string }): Promise<string> {
    const result = await postForm(FED_EXISTING_WAYBILL_URL, {
      ...authFields(),
      ...payload,
    });
    return assertFedSuccess(result, 'existing');
  },
};
