import { HTTP_STATUS } from '@/constants/http.js';
import { env } from '@/config/env.js';
import { logger } from '@/config/logger.js';
import { ApiError } from '@/utils/errors/api-error.js';
import {
  fedStatusMessage,
  isFedInvalidOrderIdStatus,
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

function toFormBody(fields: Record<string, string | undefined>): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value) continue;
    body.append(key, value);
  }
  return body;
}

async function postForm(
  url: string,
  fields: Record<string, string | undefined>,
): Promise<FedApiResponse> {
  const response = await fetch(url, {
    method: 'POST',
    // PHP samples post multipart form-data (not JSON). Let fetch set the boundary.
    body: toFormBody(fields),
  });

  const raw = await response.text();
  if (!response.ok) {
    logger.error({ status: response.status, body: raw.slice(0, 500) }, 'FED API HTTP error');
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      `FED API HTTP ${response.status}`,
      'FED_HTTP_ERROR',
    );
  }

  let parsed: FedApiResponse;
  try {
    parsed = JSON.parse(raw) as FedApiResponse;
  } catch {
    logger.error({ body: raw.slice(0, 500) }, 'FED API returned non-JSON');
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'FED API returned invalid JSON',
      'FED_INVALID_RESPONSE',
    );
  }

  parsed.status = Number(parsed.status);
  return parsed;
}

async function postParcel(
  url: string,
  fields: Record<string, string | undefined>,
  context: 'new' | 'existing',
): Promise<FedApiResponse> {
  const result = await postForm(url, fields);
  if (isFedInvalidOrderIdStatus(result.status, context) && fields.order_id) {
    logger.warn(
      { context, orderId: fields.order_id, status: result.status },
      'FED rejected order_id — retrying without it (field is optional)',
    );
    const { order_id: _ignored, ...withoutOrderId } = fields;
    return postForm(url, withoutOrderId);
  }
  return result;
}

function assertFedSuccess(result: FedApiResponse, context: 'new' | 'existing'): string {
  if (result.status === 200 && result.waybill_no) {
    return String(result.waybill_no);
  }

  const message = fedStatusMessage(result.status, context);
  throw ApiError.badRequest(message, { fedStatus: result.status, context }, 'FED_API_ERROR');
}

export const fedClient = {
  isConfigured: isFedConfigured,

  getWebhookUrl(): string {
    const base = env.API_PUBLIC_URL.replace(/\/$/, '');
    return `${base}${env.API_PREFIX}/integrations/fed/webhook`;
  },

  async createNewWaybill(payload: FedParcelPayload): Promise<string> {
    const result = await postParcel(
      FED_NEW_WAYBILL_URL,
      { ...authFields(), ...payload },
      'new',
    );
    return assertFedSuccess(result, 'new');
  },

  async createExistingWaybill(payload: FedParcelPayload & { waybill_id: string }): Promise<string> {
    const result = await postParcel(
      FED_EXISTING_WAYBILL_URL,
      { ...authFields(), ...payload },
      'existing',
    );
    return assertFedSuccess(result, 'existing');
  },
};
