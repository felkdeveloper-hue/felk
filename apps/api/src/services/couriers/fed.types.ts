/** FED new-waybill and existing-waybill APIs use different status codes. */

export interface FedParcelPayload {
  order_id?: string;
  parcel_weight: string;
  parcel_description: string;
  recipient_name: string;
  recipient_contact_1: string;
  recipient_contact_2?: string;
  recipient_address: string;
  recipient_city: string;
  amount: string;
  exchange: '0' | '1';
  waybill_id?: string;
}

export interface FedApiResponse {
  status: number;
  waybill_no?: string;
}

export interface FedShipmentMetadata {
  carrier: 'FED';
  waybillNo: string;
  fedStatus?: string;
  fedStatusUpdatedAt?: string;
  createdAt: string;
  mode: 'new' | 'existing';
  statusHistory: Array<{
    status: string;
    at: string;
  }>;
}

export interface FedTrackingMetadata {
  carrier: 'FED';
  trackingNumber: string;
  trackingUrl: string;
  lastCourierStatus?: string;
  lastCourierUpdateAt?: string;
}

export const FED_NEW_STATUS_MESSAGES: Record<number, string> = {
  200: 'Successful',
  201: 'FED client is inactive',
  202: 'FED rejected the order reference',
  203: 'Invalid parcel weight',
  204: 'Empty or invalid parcel description',
  205: 'Empty or invalid recipient name',
  206: 'Recipient phone number is not valid',
  207: 'Second contact number is not valid',
  208: 'Empty or invalid address',
  209: 'Invalid city — use a city name from the FED city list',
  210: 'FED could not insert the parcel, try again',
  211: 'Invalid FED API key',
  212: 'Invalid or inactive FED client',
  213: 'Invalid exchange value',
  214: 'FED system is in maintenance mode',
};

export const FED_EXISTING_STATUS_MESSAGES: Record<number, string> = {
  200: 'Successful',
  201: 'Waybill type must be CRE or CCP',
  202: 'This CRE/CCP waybill is already used. Uncheck the box to generate a new waybill, or enter an unused number.',
  203: 'This waybill is not assigned to your FED account yet',
  204: 'FED client is inactive',
  205: 'FED rejected the order reference',
  206: 'Invalid parcel weight',
  207: 'Empty or invalid parcel description',
  208: 'Empty or invalid recipient name',
  209: 'Recipient phone number is not valid',
  210: 'Second contact number is not valid',
  211: 'Empty or invalid address',
  212: 'Invalid amount — use 0 for CRE waybills',
  213: 'Invalid city — use a city name from the FED city list',
  214: 'FED could not insert the parcel, try again',
  215: 'Invalid or inactive FED client',
  216: 'Invalid FED API key',
  217: 'Invalid exchange value',
  218: 'FED system is in maintenance mode',
};

export function fedStatusMessage(status: number, context: 'new' | 'existing'): string {
  const map = context === 'existing' ? FED_EXISTING_STATUS_MESSAGES : FED_NEW_STATUS_MESSAGES;
  return map[status] ?? `FED ${context} waybill request failed (status ${status})`;
}

export function isFedInvalidOrderIdStatus(status: number, context: 'new' | 'existing'): boolean {
  return context === 'existing' ? status === 205 : status === 202;
}

/** FED docs: order_id is optional; hyphens in ORD-… numbers are often rejected. */
export function sanitizeFedOrderId(orderNumber: string): string {
  return orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
}

/**
 * FED contact fields expect a local Sri Lanka mobile, typically 07XXXXXXXX.
 * Our internal normalizer strips the trunk 0.
 */
export function formatFedContact(normalizedDigits: string): string {
  const digits = (normalizedDigits ?? '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return digits;
  if (digits.startsWith('94') && digits.length >= 11) {
    return formatFedContact(digits.slice(2));
  }
  return digits;
}
